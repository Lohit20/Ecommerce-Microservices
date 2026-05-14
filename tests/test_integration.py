"""
Integration tests for the Ecommerce Microservices platform.

All requests go through the Nginx gateway on port 3000.
Tests are grouped by domain: gateway routing, auth, products,
stock atomicity, cart, orders, recommendations, and a full E2E flow.
"""

import uuid
import requests
import pytest

BASE = "http://localhost:3000"


# ── Helpers ───────────────────────────────────────────────────────────────────

def _register(email, password="TestPass123"):
    return requests.post(f"{BASE}/api/auth/auth/register", json={
        "username": "ciuser",
        "email": email,
        "password": password,
        "address": "1 CI Street",
        "phone_number": "000-0000",
    })


def _login(email, password="TestPass123"):
    return requests.post(f"{BASE}/api/auth/auth/login", json={
        "email": email,
        "password": password,
    })


def _add_to_cart(user_id, product_id, quantity, headers):
    return requests.post(
        f"{BASE}/api/cart/cart/{user_id}/add",
        json=[{"product_id": product_id, "quantity": quantity}],
        headers=headers,
    )


def _checkout(user_id, payment_method, headers):
    return requests.post(
        f"{BASE}/api/cart/checkout/{user_id}",
        json=payment_method,
        headers=headers,
    )


# ── 1. Gateway routing ────────────────────────────────────────────────────────

class TestGateway:
    """Verify all four services are reachable through port 3000."""

    def test_products_reachable_via_gateway(self):
        r = requests.get(f"{BASE}/api/products/get_all_products/")
        assert r.status_code == 200

    def test_recommendations_reachable_via_gateway(self):
        r = requests.get(f"{BASE}/api/search/recommendations")
        assert r.status_code == 200

    def test_auth_reachable_via_gateway(self):
        r = requests.post(
            f"{BASE}/api/auth/auth/login",
            json={"email": "nobody@test.com", "password": "x"},
        )
        assert r.status_code == 401  # reachable — credentials just wrong

    def test_cart_reachable_via_gateway(self):
        r = requests.get(f"{BASE}/api/cart/cart/fakeid")
        assert r.status_code == 403  # reachable — just requires JWT

    def test_spa_routes_still_work(self):
        for path in ["/", "/shop", "/login", "/register", "/cart"]:
            r = requests.get(f"{BASE}{path}")
            assert r.status_code == 200, f"SPA route {path} returned {r.status_code}"


# ── 2. Authentication ─────────────────────────────────────────────────────────

class TestAuth:
    def test_register_returns_token_and_user(self, unique_email):
        r = _register(unique_email)
        assert r.status_code == 200
        data = r.json()
        assert "token" in data
        assert data["token_type"] == "bearer"
        assert data["user"]["email"] == unique_email
        assert "id" in data["user"]

    def test_token_contains_user_id(self, unique_email):
        r = _register(unique_email)
        data = r.json()
        assert data["user"]["id"]  # user_id present in response (embedded in JWT too)

    def test_login_with_correct_credentials(self, unique_email):
        _register(unique_email)
        r = _login(unique_email)
        assert r.status_code == 200
        assert "token" in r.json()

    def test_login_with_wrong_password_returns_401(self, unique_email):
        _register(unique_email)
        r = _login(unique_email, password="wrongpass")
        assert r.status_code == 401

    def test_login_unknown_email_returns_401(self):
        r = _login("doesnotexist@test.com")
        assert r.status_code == 401

    def test_duplicate_email_returns_400(self, unique_email):
        _register(unique_email)
        r = _register(unique_email)
        assert r.status_code == 400


# ── 3. Products ───────────────────────────────────────────────────────────────

class TestProducts:
    def test_get_all_products_returns_685(self, all_products):
        assert len(all_products) == 685

    def test_get_all_products_have_required_fields(self, all_products):
        required = {"product_id", "name", "main_category", "stock", "discount_price"}
        for p in all_products[:10]:
            assert required.issubset(p.keys())

    def test_get_single_product(self, stocked_product):
        pid = stocked_product["product_id"]
        r = requests.get(f"{BASE}/api/products/get_product/{pid}")
        assert r.status_code == 200
        assert r.json()["product_id"] == pid

    def test_get_nonexistent_product_returns_404(self):
        r = requests.get(f"{BASE}/api/products/get_product/99999999")
        assert r.status_code == 404

    def test_delete_without_token_returns_403(self, stocked_product):
        pid = stocked_product["product_id"]
        r = requests.delete(f"{BASE}/api/products/delete_product/{pid}")
        assert r.status_code == 403

    def test_insert_without_token_returns_403(self):
        r = requests.post(f"{BASE}/api/products/insert_new_product/", json={})
        assert r.status_code == 403

    def test_update_product_without_token_returns_403(self, stocked_product):
        pid = stocked_product["product_id"]
        r = requests.put(f"{BASE}/api/products/update_product/{pid}", json={})
        assert r.status_code == 403


# ── 4. Stock atomicity ────────────────────────────────────────────────────────

class TestStockAtomicity:
    def test_normal_decrement_works(self, stocked_product):
        pid = stocked_product["product_id"]
        before = requests.get(f"{BASE}/api/products/get_product/{pid}").json()["stock"]
        r = requests.patch(
            f"{BASE}/api/products/update_stock/{pid}",
            json={"quantity": -1},
        )
        assert r.status_code == 200
        after = requests.get(f"{BASE}/api/products/get_product/{pid}").json()["stock"]
        assert after == before - 1
        # restore
        requests.patch(f"{BASE}/api/products/update_stock/{pid}", json={"quantity": 1})

    def test_over_decrement_returns_409(self, stocked_product):
        pid = stocked_product["product_id"]
        r = requests.patch(
            f"{BASE}/api/products/update_stock/{pid}",
            json={"quantity": -999999},
        )
        assert r.status_code == 409

    def test_stock_never_goes_negative(self, stocked_product):
        import concurrent.futures

        pid = stocked_product["product_id"]
        stock_before = requests.get(f"{BASE}/api/products/get_product/{pid}").json()["stock"]
        overflow = 5  # requests beyond available stock

        def decrement_one():
            return requests.patch(
                f"{BASE}/api/products/update_stock/{pid}",
                json={"quantity": -1},
            )

        with concurrent.futures.ThreadPoolExecutor(max_workers=stock_before + overflow) as ex:
            futures = [ex.submit(decrement_one) for _ in range(stock_before + overflow)]
            results = [f.result() for f in concurrent.futures.as_completed(futures)]

        success = sum(1 for r in results if r.status_code == 200)
        rejected = sum(1 for r in results if r.status_code == 409)
        final_stock = requests.get(f"{BASE}/api/products/get_product/{pid}").json()["stock"]

        assert final_stock == 0, f"Stock should be 0, got {final_stock}"
        assert success == stock_before, f"Expected {stock_before} successes, got {success}"
        assert rejected == overflow, f"Expected {overflow} rejections, got {rejected}"

        # restore
        requests.patch(f"{BASE}/api/products/update_stock/{pid}", json={"quantity": stock_before})

    def test_increment_always_works(self, stocked_product):
        pid = stocked_product["product_id"]
        r = requests.patch(
            f"{BASE}/api/products/update_stock/{pid}",
            json={"quantity": 100},
        )
        assert r.status_code == 200
        # restore
        requests.patch(f"{BASE}/api/products/update_stock/{pid}", json={"quantity": -100})


# ── 5. Cart ───────────────────────────────────────────────────────────────────

class TestCart:
    def test_get_cart_without_token_returns_403(self, registered_user):
        uid = registered_user["user_id"]
        r = requests.get(f"{BASE}/api/cart/cart/{uid}")
        assert r.status_code == 403

    def test_cannot_access_another_users_cart(self, registered_user):
        r = requests.get(
            f"{BASE}/api/cart/cart/someRandomUserId999",
            headers=registered_user["headers"],
        )
        assert r.status_code == 403

    def test_new_cart_is_empty(self, registered_user):
        uid = registered_user["user_id"]
        r = requests.get(f"{BASE}/api/cart/cart/{uid}", headers=registered_user["headers"])
        assert r.status_code == 200
        assert r.json()["items"] == []

    def test_add_item_to_cart(self, registered_user, stocked_product):
        uid = registered_user["user_id"]
        r = _add_to_cart(uid, stocked_product["product_id"], 2, registered_user["headers"])
        assert r.status_code == 200

        cart = requests.get(
            f"{BASE}/api/cart/cart/{uid}", headers=registered_user["headers"]
        ).json()
        assert len(cart["items"]) == 1
        assert cart["items"][0]["quantity"] == 2

    def test_add_decrements_stock(self, registered_user, stocked_product):
        pid = stocked_product["product_id"]
        uid = registered_user["user_id"]
        before = requests.get(f"{BASE}/api/products/get_product/{pid}").json()["stock"]
        _add_to_cart(uid, pid, 1, registered_user["headers"])
        after = requests.get(f"{BASE}/api/products/get_product/{pid}").json()["stock"]
        assert after == before - 1

    def test_remove_item_restores_stock(self, registered_user, stocked_product):
        pid = stocked_product["product_id"]
        uid = registered_user["user_id"]
        _add_to_cart(uid, pid, 1, registered_user["headers"])
        before_remove = requests.get(f"{BASE}/api/products/get_product/{pid}").json()["stock"]

        requests.post(
            f"{BASE}/api/cart/cart/{uid}/remove/{pid}",
            headers=registered_user["headers"],
        )
        after_remove = requests.get(f"{BASE}/api/products/get_product/{pid}").json()["stock"]
        assert after_remove == before_remove + 1

    def test_clear_cart(self, registered_user, stocked_product):
        uid = registered_user["user_id"]
        _add_to_cart(uid, stocked_product["product_id"], 1, registered_user["headers"])
        r = requests.post(
            f"{BASE}/api/cart/cart/{uid}/clear", headers=registered_user["headers"]
        )
        assert r.status_code == 200


# ── 6. Orders ─────────────────────────────────────────────────────────────────

class TestOrders:
    def test_checkout_empty_cart_returns_404(self, registered_user):
        uid = registered_user["user_id"]
        r = _checkout(uid, "cod", registered_user["headers"])
        assert r.status_code == 404

    @pytest.mark.parametrize("payment", ["credit_card", "paypal", "cod"])
    def test_checkout_all_payment_methods(self, registered_user, stocked_product, payment):
        uid = registered_user["user_id"]
        _add_to_cart(uid, stocked_product["product_id"], 1, registered_user["headers"])
        r = _checkout(uid, payment, registered_user["headers"])
        assert r.status_code == 200
        data = r.json()
        assert "order_id" in data
        assert "transaction_id" in data

    def test_checkout_clears_cart(self, registered_user, stocked_product):
        uid = registered_user["user_id"]
        _add_to_cart(uid, stocked_product["product_id"], 1, registered_user["headers"])
        _checkout(uid, "cod", registered_user["headers"])
        cart = requests.get(
            f"{BASE}/api/cart/cart/{uid}", headers=registered_user["headers"]
        ).json()
        assert cart["items"] == []

    def test_transactions_listed_after_checkout(self, registered_user, stocked_product):
        uid = registered_user["user_id"]
        _add_to_cart(uid, stocked_product["product_id"], 1, registered_user["headers"])
        _checkout(uid, "paypal", registered_user["headers"])
        r = requests.get(
            f"{BASE}/api/cart/transactions/{uid}", headers=registered_user["headers"]
        )
        assert r.status_code == 200
        txns = r.json()
        assert len(txns) >= 1
        assert txns[-1]["payment_method"] == "paypal"

    def test_transactions_without_token_returns_403(self, registered_user):
        uid = registered_user["user_id"]
        r = requests.get(f"{BASE}/api/cart/transactions/{uid}")
        assert r.status_code == 403


# ── 7. Recommendations ────────────────────────────────────────────────────────

class TestRecommendations:
    def test_recommendations_returns_dict_of_categories(self):
        r = requests.get(f"{BASE}/api/search/recommendations")
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, dict)
        assert len(data) > 0

    def test_each_category_has_products(self):
        data = requests.get(f"{BASE}/api/search/recommendations").json()
        for category, products in data.items():
            assert isinstance(products, list), f"Category '{category}' has no product list"
            assert len(products) > 0

    def test_recommended_products_are_in_stock(self):
        data = requests.get(f"{BASE}/api/search/recommendations").json()
        for category, products in data.items():
            for p in products:
                assert p["stock"] > 0, f"Out-of-stock product in recommendations: {p['name']}"

    def test_recommendations_sourced_from_products_service(self, all_products):
        data = requests.get(f"{BASE}/api/search/recommendations").json()
        all_ids = {p["product_id"] for p in all_products}
        for category, products in data.items():
            for p in products:
                assert p["product_id"] in all_ids, \
                    f"Recommended product {p['product_id']} not in Products Service"


# ── 8. Full end-to-end flow ───────────────────────────────────────────────────

class TestEndToEnd:
    def test_complete_purchase_flow(self, unique_email, all_products):
        # 1. Register
        reg = _register(unique_email)
        assert reg.status_code == 200
        token = reg.json()["token"]
        user_id = reg.json()["user"]["id"]
        headers = {"Authorization": f"Bearer {token}"}

        # 2. Login
        login = _login(unique_email)
        assert login.status_code == 200

        # 3. Browse products
        products = all_products
        assert len(products) == 685

        # 4. Pick an in-stock product
        product = next(p for p in products if p["stock"] > 2)
        pid = product["product_id"]
        stock_before = product["stock"]

        # 5. Capture live stock right before adding (other tests may have changed it)
        stock_before = requests.get(f"{BASE}/api/products/get_product/{pid}").json()["stock"]

        # 6. Add to cart
        add = _add_to_cart(user_id, pid, 2, headers)
        assert add.status_code == 200

        # 7. Verify stock decreased by exactly 2
        updated_stock = requests.get(f"{BASE}/api/products/get_product/{pid}").json()["stock"]
        assert updated_stock == stock_before - 2

        # 8. Verify cart has items
        cart = requests.get(f"{BASE}/api/cart/cart/{user_id}", headers=headers).json()
        assert any(item["product_id"] == pid for item in cart["items"])

        # 9. Checkout
        checkout = _checkout(user_id, "credit_card", headers)
        assert checkout.status_code == 200
        order_id = checkout.json()["order_id"]
        assert order_id

        # 10. Cart is now empty
        cart_after = requests.get(f"{BASE}/api/cart/cart/{user_id}", headers=headers).json()
        assert cart_after["items"] == []

        # 11. Order appears in history
        txns = requests.get(f"{BASE}/api/cart/transactions/{user_id}", headers=headers).json()
        assert any(t["order_id"] == order_id for t in txns)
        order = next(t for t in txns if t["order_id"] == order_id)
        assert order["payment_method"] == "credit_card"
        assert order["total_amount"] > 0
