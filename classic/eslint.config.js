import js from '@eslint/js';
import globals from 'globals';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';

export default [
    {
        ignores: [
            'dist',
            'node_modules',
            'coverage',
            'documentation',
            'src/routeTree.gen.ts',
            'src/components/@hk-gantt/gantt-master/tests',
        ],
    },
    js.configs.recommended,
    {
        files: ['**/*.{js,jsx}'],
        languageOptions: {
            ecmaVersion: 'latest',
            sourceType: 'module',
            globals: {
                ...globals.browser,
                ...globals.es2020,
            },
            parserOptions: {
                ecmaFeatures: {
                    jsx: true,
                },
            },
        },
        settings: {
            react: {
                version: 'detect',
            },
        },
        plugins: {
            react,
            'react-hooks': reactHooks,
            'react-refresh': reactRefresh,
        },
        rules: {
            ...react.configs.recommended.rules,
            ...react.configs['jsx-runtime'].rules,
            ...reactHooks.configs.recommended.rules,
            'react/jsx-no-target-blank': 'off',
            'react/no-children-prop': 'off',
            'react/no-unescaped-entities': 'off',
            'no-console': ['error', { allow: ['warn', 'error'] }],
            'no-debugger': 'error',
            'no-unused-vars': 'off',
            'react/prop-types': 'off',
            'react-hooks/immutability': 'off',
            'react-hooks/incompatible-library': 'off',
            'react-hooks/set-state-in-effect': 'off',
            'react-refresh/only-export-components': 'off',
        },
    },
    {
        files: [
            'eslint.config.js',
            'vite.config.js',
            'postcss.config.js',
        ],
        languageOptions: {
            globals: {
                ...globals.node,
            },
        },
    },
];
