import React from 'react';
import { useSearch } from '../context/SearchContext';

const SearchBar = ({ allProducts }) => {
    const { query, setQuery, setResults } = useSearch();

    const handleSearch = (e) => {
        const value = e.target.value;
        setQuery(value);
        const filtered = allProducts.filter(product =>
            product.name.toLowerCase().includes(value.toLowerCase())
        );
        setResults(filtered);
    };

    return (
        <input
            type="text"
            placeholder="Search products..."
            value={query}
            onChange={handleSearch}
            className="search-bar"
        />
    );
};

export default SearchBar;
