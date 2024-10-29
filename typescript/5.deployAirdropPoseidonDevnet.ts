// Declare/Deploy a demo of Airdrop contract
// Coded with Starknet.js v6.17.0 and Starknet-devnet-rs v0.2.0
// Launch with npx ts-node 5.deployAirdropPoseidonDevnet.ts

import { Account, json, Contract, RpcProvider, RPC, Call, Calldata, CallData } from "starknet";
import type { SPEC } from "@starknet-io/types-js";
import * as dotenv from "dotenv";
import fs from "fs";
dotenv.config();

//         👇👇👇
// 🚨🚨🚨 launch 'starknet-devnet --seed 0' before using this script
//         👆👆👆
async function main() {
    const provider = new RpcProvider({ nodeUrl: "http://127.0.0.1:5050/rpc" }); // only for starknet-devnet-rs
    console.log("Provider connected to Starknet-devnet-rs");

    // initialize existing pre-deployed account 0 of Devnet
    console.log('OZ_ACCOUNT_ADDRESS=', process.env.OZ_ACCOUNT0_DEVNET_ADDRESS);
    const privateKey0 = process.env.OZ_ACCOUNT0_DEVNET_PRIVATE_KEY ?? "";
    const accountAddress0: string = process.env.OZ_ACCOUNT0_DEVNET_ADDRESS ?? "";
    const account0 = new Account(provider, accountAddress0, privateKey0, undefined, RPC.ETransactionVersion.V2);
    console.log("Account 0 connected.\n In progress...");

    // declare/deploy Airdrop test
    const compiledSierraAirdrop = json.parse(fs.readFileSync("./compiledContracts/cairo240/airdrop.sierra.json").toString("ascii"));
    const compiledCasmAirdrop = json.parse(fs.readFileSync("./compiledContracts/cairo240/airdrop.casm.json").toString("ascii"));
    //         👇👇👇
    // 🚨🚨🚨 Change addresses following execution of scripts 2.deployMerkleVerifPoseidonDevnet.ts 
    const ERC20_ADDRESS = "0x1adfa979bc2ec510f98dec71f34520408cc730b5e6f6980c3ac9cb28521ff78";
    const MERKLE_VERIF_ADDRESS = "0x2ddbfbf0a4944b4bb702a715773fe985c4a305a101adecb361e0f1522159c3b";
    //         👆👆👆
    console.log('In progress...');
    const myCallAirdrop = new CallData(compiledSierraAirdrop.abi);
    const myConstructorAirdrop: Calldata = myCallAirdrop.compile("constructor", {
        erc20_address: ERC20_ADDRESS,
        merkle_address: MERKLE_VERIF_ADDRESS,
        erc20_owner: account0.address,
        start_time: 0, // no date of airdrop start
    });
    const deployResponse = await account0.declareAndDeploy({
        contract: compiledSierraAirdrop,
        casm: compiledCasmAirdrop,
        constructorCalldata: myConstructorAirdrop
    });

    const airdropAddress = deployResponse.deploy.contract_address;
    const airdropClassHash = deployResponse.declare.class_hash;
    console.log("Airdrop contract :");
    console.log("class_hash =", airdropClassHash);
    console.log("address =", airdropAddress);

    // authorize the Airdrop contract to transfer some tokens
    const compiledSierraERC20 = json.parse(fs.readFileSync("compiledContracts/cairo220/erc20OZ070.sierra.json").toString("ascii"));
    const erc20Contract = new Contract(compiledSierraERC20.abi, ERC20_ADDRESS, account0);
    const authorize: Call = erc20Contract.populate("approve", {
        spender: airdropAddress,
        amount: 500
    });
    const tx = await account0.execute(authorize);
    const txR = await provider.waitForTransaction(tx.transaction_hash);
    console.log("authorize =",(txR.value as SPEC.INVOKE_TXN_RECEIPT).execution_status);

    console.log("✅ test completed.");
}
main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });