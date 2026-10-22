import React from 'react';
import CreatableSelect from 'react-select/creatable';

const HkTags = ({ options, defaultValue }) => {
    return (
        <CreatableSelect
            isMulti
            isClearable={false}
            options={options}
            defaultValue={defaultValue}
            styles={{
                control: (baseStyles, state) => ({
                    ...baseStyles,
                    borderColor: state.isFocused ? '#007D88' : '#007D88',
                }),
                multiValue: (styles) => {
                    return {
                        ...styles,
                        backgroundColor: "whitesmoke",
                    };
                },
                multiValueRemove: (styles) => ({
                    ...styles,
                    ':hover': {
                        backgroundColor: "whitesmoke",
                        color: 'black',
                    },
                }),
            }}
        />
    )
}

export default HkTags
