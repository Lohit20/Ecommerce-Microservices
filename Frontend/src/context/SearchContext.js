import React, { createContext, useContext, useState } from 'react';

const SearchContext = createContext();

export const SearchProvider = ({ children }) => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);

    return (
        <SearchContext.Provider value={{ query, setQuery, results, setResults }}>
            {children}
        </SearchContext.Provider>
    );
};

export const useSearch = () => useContext(SearchContext);
