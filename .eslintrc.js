module.exports = {
    "env": {
        "browser": true,
        "commonjs": true,
        "es2021": true
    },
    "extends": "eslint:recommended",
    "parserOptions": {
        "ecmaVersion": 12
    },
    "rules": {
        "consistent-return": 2,
        "indent"           : [1, 4],
        "no-else-return"   : 1,
        "semi"             : [1, "always"],
        "space-unary-ops"  : 2
    }
};