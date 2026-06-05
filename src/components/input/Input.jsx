import React from 'react';

import './input.scss';

const Input = ({ type, placeholder, value, onChange, ...rest }) => {
    return (
        <input
            type={type}
            placeholder={placeholder}
            value={value}
            onChange={onChange ? (e) => onChange(e) : null}
            {...rest}
        />
    );
}

export default Input;
