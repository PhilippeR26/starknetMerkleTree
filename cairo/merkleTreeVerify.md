# Cairo contracts for Merkle tree verification

These 2 contracts are used in Starknet as libraries, to verify a proof of a Merkle tree created with the JS/TS starknet-merkle-tree library.

## Location :

Classes available in Starknet Mainnet, Goerli Testnet and Sepolia Testnet :
| Tree hash |  Class hash | 
| :---: | ---: |
| **Pedersen class hash** |  Soon | 
| **Poseidon class hash** | `0x03e2efc98f902c0b33eee6c3daa97b941912bcab61b6162884380c682e594eaf`| 

## Deployment :

For each Merkle tree, you have to deploy a new instance of one of these 2 classes (choose Pedersen or Poseidon, in accordance with the tree that you have created). The constructor includes only one information : the root of this tree. By this way, this deployment is cost effective : no declaration of class (already made) and a very small storage space (only one felt).  
Example with Starknet.js :
```typescript
const MERKLE_CLASS_HASH_PEDERSEN = "Soon";
const MERKLE_CLASS_HASH_POSEIDON = "0x03e2efc98f902c0b33eee6c3daa97b941912bcab61b6162884380c682e594eaf";
const tree = Merkle.StarknetMerkleTree.load(
        JSON.parse(fs.readFileSync('./treeTestPoseidon.json', 'ascii'))
    );
const myConstructorMerkleVerify: Calldata = CallData.compile([tree.root]);
const deployResponse = await account0.deployContract({
    //         👇👇👇 change here to PEDERSEN or POSEIDON
    classHash: MERKLE_CLASS_HASH_POSEIDON,
    constructorCalldata: myConstructorMerkleVerify
});
const MerkleVerifyAddress = deployResponse.contract_address;
```

> Today, the Cairo source code of these two contracts is not public.

## Usage :
You have to create/declare/deploy your dedicated smart-contract (called here contract 2) to handle the Airdrop (list of already performed airdrops, distribution of tokens, timing, administration, etc..).  
This contract 2 has to call the contract deployed above (called here contract 1) to verify if the data are correct and are part of the Merkle tree.   
Contract 1 is able to say if an address and the corresponding data are included in the tree or not. Just by storing a felt252 in Starknet, you can check that an address is included in a list of thousand of addresses, and trigger in contract 2 a distribution of token to this address.  
Hereunder an extract of an example of a Contract 2 that call Contract 1 to verify a proof :
```rust
#[starknet::interface]
trait IMerkleVerify<TContractState> {
    fn get_root(self: @TContractState) -> felt252;
    fn verify_from_leaf_hash(
        self: @TContractState, leaf_hash: felt252, proof: Array<felt252>
    ) -> bool;
    fn verify_from_leaf_array(
        self: @TContractState, leaf_array: Array<felt252>, proof: Array<felt252>
    ) -> bool;
    fn verify_from_leaf_airdrop(
        self: @TContractState, address: ContractAddress, amount: u256, proof: Array<felt252>
    ) -> bool;
    fn hash_leaf_array(self: @TContractState, leaf: Array<felt252>) -> felt252;
}
...
fn constructor(
    ref self: ContractState,
    erc20_address: ContractAddress,
    merkle_address: ContractAddress,
    erc20_owner: ContractAddress,
    start_time: u64,
) 
...
fn request_airdrop(
    ref self: ContractState, address: ContractAddress, amount: u256, proof: Array<felt252>
) {
    let already_airdropped: bool = self.airdrop_performed.read(address);
    assert(!already_airdropped, "Address already airdropped");
    let current_time: u64 = get_block_timestamp();
    let airdrop_start_time: u64 = self.start_time.read();
    assert(current_time >= airdrop_start_time, "Airdrop has not started yet.");
    let is_request_valid: bool = IMerkleVerifyDispatcher {
        contract_address: self.merkle_address.read()
    }
        .verify_from_leaf_airdrop( address, amount, proof);
    assert(is_request_valid, "Proof not valid."); // revert if not valid
    // Airdrop
    // Register the address as already airdropped
    // to be sure to perform the airdrop only once per address.
    self.airdrop_performed.write(address, true);
    // Perform here your transfer of token.
    // if needed, create some events.
    return ();
}
```
> The Cairo source code is [here](./airdrop.cairo)

In your DAPP, you can call the contract 2 this way (here with Starknet.js) :
```typescript
const compiledTest = json.parse(fs.readFileSync("./airdrop.sierra.json").toString("ascii"));
const myContract = new Contract(compiledTest.abi, AIRDROP_ADDRESS, account0);

const tree = Merkle.StarknetMerkleTree.load(
        JSON.parse(fs.readFileSync('./treeTestPoseidon.json', 'ascii'))
    );
const leaf=tree.getInputData(3);
const proof=tree.getProof(3);

const result0 = await myContract.is_address_airdropped(leaf[0]);
console.log("Is address already airdropped =", result0);

const amount: Uint256 = { low: leaf[1], high: leaf[2] };
const myCall = myContract.populate("request_airdrop", {
    address: leaf[0],
    amount,
    proof
})
const txResp = await account0.execute(myCall);
console.log("executed...");
await provider.waitForTransaction(txResp.transaction_hash);
const result1 = await myContract.is_address_airdropped(leaf[0]);
console.log("result from airdrop request =", result1);
```

## API :

Contract 2 has to be deployed with a constructor including the address of your deployed Contract 1.  
```rust
fn constructor(
        ref self: ContractState,
        erc20_address: ContractAddress,
        merkle_address: ContractAddress, // address of Contract 1
        start_time: u64,
    )
```
This value has to be stored in the contract.

### hash_leaf_array() :

Calculate the Pedersen/Poseidon hash of a Merkle tree leaf.  
Input is an array of felt252 that contains all the data of a leaf.

```rust
fn hash_leaf_array(self: @ContractState, mut leaf: Array<felt252>) -> felt252
```
Example of Contract 2 :
```rust 
let mut hash = starknet::call_contract_syscall(
    self.merkle_address.read(), selector!("hash_leaf_array"), leaf.span()
)
    .unwrap_syscall();
let mut leave_hash: felt252 = Serde::<felt252>::deserialize(ref hash)
    .unwrap();
```

### verify_from_leaf_hash() :

From the hash and the proof of a leaf, verify that this leaf is included in the Merkle tree.  
```rust
fn verify_from_leaf_hash(self: @ContractState, leaf_hash: felt252, proof: Array<felt252>) -> bool
```
Example of Contract 2 :
```rust
let mut call_data: Array<felt252> = ArrayTrait::new();
call_data.append(leaf_hash);
Serde::serialize(@proof, ref call_data);
let mut hash_valid = starknet::call_contract_syscall(
    self.merkle_address.read(), selector!("verify_from_leaf_hash"), call_data.span()
)
    .unwrap_syscall();
let mut is_request_valid: bool = Serde::<bool>::deserialize(ref is_leave_valid)
    .unwrap();
```


### verify_from_leaf_array() :
From the content and the proof of a leaf, verify that this leaf is included in the Merkle tree.  
```rust
fn verify_from_leaf_array(self: @ContractState, leaf_array: Array<felt252>, proof: Array<felt252>) -> bool
```
Example of Contract 2 :
```rust
let mut call_data: Array<felt252> = ArrayTrait::new();
Serde::serialize(@leaf_array, ref call_data);
Serde::serialize(@proof, ref call_data);
let mut hash_valid = starknet::call_contract_syscall(
    self.merkle_address.read(), selector!("verify_from_leaf_array"), call_data.span()
)
    .unwrap_syscall();
let mut is_request_valid: bool = Serde::<bool>::deserialize(ref is_leave_valid)
    .unwrap();
```

### verify_from_leaf_airdrop() :
To use for a Merkle tree with leaves including (only) : address, u256 amount (low and high).  
From address, amount and the proof of a leaf, verify that these data are included in the Merkle tree.  
Example of Contract 2 :
```rust
let mut call_data: Array<felt252> = ArrayTrait::new();
call_data.append(address.into());
call_data.append(amount.low.into());
call_data.append(amount.high.into());
Serde::serialize(@proof, ref call_data);
let mut is_leave_valid = starknet::call_contract_syscall(
    self.merkle_address.read(), selector!("verify_from_leaf_airdrop"), call_data.span()
)
    .unwrap_syscall();
let mut is_request_valid: bool = Serde::<bool>::deserialize(ref is_leave_valid)
    .unwrap();
```
