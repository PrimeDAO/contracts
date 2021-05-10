/*

██████╗░██████╗░██╗███╗░░░███╗███████╗██████╗░░█████╗░░█████╗░
██╔══██╗██╔══██╗██║████╗░████║██╔════╝██╔══██╗██╔══██╗██╔══██╗
██████╔╝██████╔╝██║██╔████╔██║█████╗░░██║░░██║███████║██║░░██║
██╔═══╝░██╔══██╗██║██║╚██╔╝██║██╔══╝░░██║░░██║██╔══██║██║░░██║
██║░░░░░██║░░██║██║██║░╚═╝░██║███████╗██████╔╝██║░░██║╚█████╔╝
╚═╝░░░░░╚═╝░░╚═╝╚═╝╚═╝░░░░░╚═╝╚══════╝╚═════╝░╚═╝░░╚═╝░╚════╝░

*/

// SPDX-License-Identifier: GPL-3.0-or-later

pragma solidity 0.5.13;

import "@daostack/arc/contracts/schemes/PriceOracleInterface.sol";
import "openzeppelin-solidity/contracts/ownership/Ownable.sol";


contract PriceOracle is PriceOracleInterface, Ownable {

    struct Price {
        uint256 numerator;
        uint256 denominator;
    }

    // token => Price
    mapping (address => Price) public tokenPrices;

    function setTokenPrice(address token, uint256 numerator, uint256 denominator) public onlyOwner {
        tokenPrices[token] = Price(numerator, denominator);
    }
    
    function getPrice(address token) public view returns (uint, uint) {
        Price memory price = tokenPrices[token];
        return (price.numerator, price.denominator);
    }
}