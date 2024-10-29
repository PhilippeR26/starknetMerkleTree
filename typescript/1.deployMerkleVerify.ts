// script valid for Pedersen and Poseidon, for all networks.
// Deploy a contract to verify a Pedersen/Poseidon Merkle tree
// Coded with Starknet.js v6.17.0 and Starknet-devnet-rs v0.2.0
// Launch with npx ts-node 1.deployMerkleVerify.ts

import { Account, Calldata, CallData, constants, RpcProvider, shortString } from 'starknet';

import fs from "fs";
import * as dotenv from "dotenv";
dotenv.config();

//    👇👇👇
// 🚨🚨🚨 launch starknet-devnet-rs 'cargo run --release -- --seed 0' before using this script
//    👆👆👆

async function main() {
    // initialize Provider. Adapt to your needs
    // Starknet-devnet-rs
    const provider = new RpcProvider({ nodeUrl: "http://127.0.0.1:5050/rpc" }); 
    // Goerli Testnet
    // const provider = new RpcProvider({ nodeUrl: 'https://starknet-testnet.blastapi.io/' + blastKey + "/rpc/v0_6" }); 
    // local Pathfinder Sepolia Testnet node :
    // const provider = new RpcProvider({ nodeUrl: "http://192.168.1.11:9545/rpc/v0_6" }); 
    // local Pathfinder Sepolia Integration node :
    //const provider = new RpcProvider({ nodeUrl: "http://192.168.1.11:9550/rpc/v0_6" }); 
    // local Juno mainnet :
    //const provider = new RpcProvider({ nodeUrl: "http://192.168.1.11:6060/v0_6" }); //v0.6.0

    // Check that communication with provider is OK
    const ch = await provider.getChainId();
    console.log("chain Id =", shortString.decodeShortString(ch), ", rpc", await provider.getSpecVersion());
    
    // initialize account. Adapt to your case
    // *** Devnet-rs 
     const privateKey0 = "0x71d7bb07b9a64f6f78ac4c816aff4da9";
     const accountAddress0: string = "0x64b48806902a367c8598f4f95c305e8c1a1acba5f082d294a43793113115691";
    // *** initialize existing Argent X Goerli Testnet  account
    // const privateKey0 = account5TestnetPrivateKey;
    // const accountAddress0 = account5TestnetAddress
    
    // *** initialize existing Argent X mainnet  account
    // const privateKey0 = account1MainnetPrivateKey;
    // const accountAddress0 = account1MainnetAddress

    // *** initialize existing Sepolia Testnet account
    //const privateKey0 = account0OZSepoliaPrivateKey;
    //const accountAddress0 = account0OZSepoliaAddress;

    // *** initialize existing Sepolia Integration account
    // const privateKey0 = account1IntegrationOZprivateKey;
    // const accountAddress0 = account1IntegrationOZaddress;

    const account0 = new Account(provider, accountAddress0, privateKey0, undefined, constants.TRANSACTION_VERSION.V2); // starknet.js v6
    console.log('existing_ACCOUNT_ADDRESS=', accountAddress0);
    console.log('existing account connected.\n');

    // deploy MerkleVerify
    const MERKLE_CLASS_HASH_PEDERSEN = "TBD";
    const MERKLE_CLASS_HASH_POSEIDON = "0x03e2efc98f902c0b33eee6c3daa97b941912bcab61b6162884380c682e594eaf";
    const root = "0x4bad3f80e8041eb3d32432fa4aed9f904db8c8ab34109879a99da696a0c5a81"
    const myConstructorMerkleVerify: Calldata = CallData.compile([root]);
    const deployResponse = await account0.deployContract({
        //         👇👇👇 change here to PEDERSEN or POSEIDON
        classHash: MERKLE_CLASS_HASH_POSEIDON,
        constructorCalldata: myConstructorMerkleVerify
    });
    const MerkleVerifyAddress = deployResponse.contract_address;
    console.log("MerkleVerify contract :");
    console.log("address =", MerkleVerifyAddress);

    console.log("✅ test completed.");
}
main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });