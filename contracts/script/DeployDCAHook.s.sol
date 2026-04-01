// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Script, console} from "forge-std/Script.sol";
import {IPoolManager} from "v4-core/src/interfaces/IPoolManager.sol";
import {Hooks} from "v4-core/src/libraries/Hooks.sol";
import {DCAHook} from "../src/DCAHook.sol";
import {HookMiner} from "v4-periphery/src/utils/HookMiner.sol";

contract DeployDCAHook is Script {
    // Base Mainnet PoolManager
    address constant POOL_MANAGER = 0x498581fF718922c3f8e6A244956aF099B2652b2b;

    // CREATE2 Deployer Proxy (same on all chains)
    address constant CREATE2_DEPLOYER = 0x4e59b44847b379578588920cA78FbF26c0B4956C;

    function run() public {
        // Only afterSwap flag
        uint160 flags = uint160(Hooks.AFTER_SWAP_FLAG);

        // Mine a salt that produces an address with the correct flag bits
        bytes memory constructorArgs = abi.encode(POOL_MANAGER);
        (address hookAddress, bytes32 salt) = HookMiner.find(
            CREATE2_DEPLOYER,
            flags,
            type(DCAHook).creationCode,
            constructorArgs
        );

        console.log("Mined hook address:", hookAddress);
        console.log("Salt:", uint256(salt));

        // Deploy
        vm.startBroadcast();
        DCAHook hook = new DCAHook{salt: salt}(IPoolManager(POOL_MANAGER));
        vm.stopBroadcast();

        require(address(hook) == hookAddress, "Hook address mismatch");

        console.log("DCAHook deployed to:", address(hook));
        console.log("");
        console.log("=== UPDATE YOUR FRONTEND ===");
        console.log("Set NEXT_PUBLIC_DCA_HOOK_ADDRESS in frontend/.env.local to:");
        console.log(address(hook));
    }
}
