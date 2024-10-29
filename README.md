<h1 style="text-align: center;"> Starknet Merkle Tree</h1>
 
<p align="center">
  <img src="./public/tree.jpg" />
</p>

<h2 style="text-align: center;"> Typescript library for Merkle trees adapted for Starknet</h1>
<br></br>

**This library has not been audited ; use at your own risks.**

> **Stars are highly appreciated! Thanks in advance.**

This library is able to create and handle Merkle trees, using very efficient and specifics hashes for the Starknet blockchain. You can use :
- Pedersen hash (by default)
- Poseidon hash (the most efficient one)

You can also generates some Merkle proofs, store the tree, hash a leave of the tree, and many other things.  
This library has been tested with success with trees up to 500 0000 leaves, each leave including 3 numbers.

**This lib will be very useful if you have to code an airdrop.**

## 🛠️ Installation 🛠️ :

```bash
npm install starknet-merkle-tree
```

## Quick example :

```typescript
import * as Merkle from "starknet-merkle-tree";
```

### 🌲 Create a Merkle tree :

The Merkle tree will be created with an array of strings as input.  
For an Airdrop, you needs a list of granted addresses, and optionally the quantity of token to distribute to each one.
```typescript
// address + quantity (u256.low + u256.high)
const airdrop: Merkle.InputForMerkle[] = [
  ['0x69b49c2cc8b16e80e86bfc5b0614a59aa8c9b601569c7b80dde04d3f3151b79', '256','0'],
  ['0x3cad9a072d3cf29729ab2fad2e08972b8cfde01d4979083fb6d15e8e66f8ab1', '25','0'],
  ['0x27d32a3033df4277caa9e9396100b7ca8c66a4ef8ea5f6765b91a7c17f0109c', '56','0'],
  ['0x7e00d496e324876bbc8531f2d9a82bf154d1a04a50218ee74cdd372f75a551a', '26','0'],
  ['0x53c615080d35defd55569488bc48c1a91d82f2d2ce6199463e095b4a4ead551', '56','0'],
    ];
const tree = Merkle.StarknetMerkleTree.create(airdrop, Merkle.HashType.Poseidon);
```
### 🫚 Get the root of the tree :
```typescript
const root = tree.root;
```

### 🎰 Create a Merkle proof :
```typescript
const inp = 3; // Nth leaf of the input list
// or
const inp = ['0x7e00d496e324876bbc8531f2d9a82bf154d1a04a50218ee74cdd372f75a551a', '26','0']; // leaf content

const proof = tree.getProof(inp);
```

### Hash a leaf :
```typescript
const inp = 3; // Nth leaf of the input list
const inpData = tree.getInputData(inp);
const leafHash = Merkle.StarknetMerkleTree.leafHash(inpData, Merkle.HashType.Poseidon);
```
### 🔎 Verify a proof with your JS/TS script :
```typescript
const inp = 3; // Nth leaf of the input list
const inpData = tree.getInputData(inp);
const isValid = tree.verify(inpData, proof);
```

### 🔎 Verify a proof in the Starknet blockchain :

You have to deploy a new instance of an existing smart-contract. There is one contract dedicated for Pedersen hash, and one other for Poseidon hash. These contracts are already declared in Starknet Mainnet, Goerli Testnet and Sepolia Testnet, with the following class hashes :

| Tree hash |  Class hash | 
| :---: | :--- |
| **Pedersen class hash** |  `0x4ff16c026ed3b1849563c95605ef8ee91ca403f2c680bda53e4f6717400b230` | 
| **Poseidon class hash** | `0x03e2efc98f902c0b33eee6c3daa97b941912bcab61b6162884380c682e594eaf`| 

So, you will not have to pay fees to declare this part of the airdrop code ; it's already made.
You have to deploy this contract (called here contract 1) with only one parameter in the constructor : the tree root.

You have to create/declare/deploy your dedicated smart-contract (called here contract 2) to handle the Airdrop (list of already performed airdrops, distribution of tokens, timing, administration, etc..).  
This contract 2 has to call the contract 1 to verify if the data are correct and are part of the Merkle tree. 
Contract 1 is able to say if an address and the corresponding data are included in the tree or not. Just by storing a felt252 in Starknet, you can check that an address is included in a list of thousand of addresses, and trigger a distribution of token to this address.

You can find a documentation of this contract 1 [here](https://github.com/PhilippeR26/starknetMerkleTree/blob/main/cairo/merkleTreeVerify.md).

> Some Typescript demo files are available [here](https://github.com/PhilippeR26/starknetMerkleTree/tree/main/typescript).

> A demo DAPP for an Airdrop is available. You can test it and analyze the source code [here](https://github.com/PhilippeR26/Airdrop-for-Starknet).

## API :

### Types :

```typescript
type InputForMerkle = string | string[];

enum HashType {
  Pedersen = "Pedersen",
  Poseidon = "Poseidon",
}
```

### StarknetMerkleTree.create() :

Creates a standard Merkle tree out of an array. Data are Hex strings or decimal strings.
```typescript
const data: Merkle.inputForMerkle[] = [
    ['0x69b49c2cc8b16e80e86bfc5b0614a59aa8c9b601569c7b80dde04d3f3151b79', '256', '0'],
    ['0x3cad9a072d3cf29729ab2fad2e08972b8cfde01d4979083fb6d15e8e66f8ab1', '25', '0'],
    ['0x27d32a3033df4277caa9e9396100b7ca8c66a4ef8ea5f6765b91a7c17f0109c', '56', '0'],
    ['0x7e00d496e324876bbc8531f2d9a82bf154d1a04a50218ee74cdd372f75a551a', '26', '0'],
    ['0x53c615080d35defd55569488bc48c1a91d82f2d2ce6199463e095b4a4ead551', '56', '0'],
];
const tree = Merkle.StarknetMerkleTree.create(data, Merkle.HashType.Pedersen);
```


### getProof() :
Returns a proof for the Nth value in the tree. Indices refer to the position of the values in the array from which the tree was constructed. Also accepts a value instead of an index, but this will be less efficient. It will fail if the value is not found in the tree.
```typescript
const proof1 = tree.getProof(3);
const proof2 = tree.getProof(["0x43af5", '100']);
// result =
[
  '0x40a6dba21b22596e979a1555a278ca58c11b5cd5e46f5801c1af8c4ab518845',
  '0x7957d036cf1e60858a601df12e0fb2921114d4b5facccf638163e0bb2be3c34',
  '0x12677ed42d2f73c92413c30d04d0b88e771bf2595c7060df46f095f2132eca2'
]
```

### verify() :
Returns a boolean that is `true` when the proof verifies that the value is contained in the tree.
```typescript
const result1 = tree.verify(3, proof);
const result2 = tree.verify(["0x34e67d", '100'], proof);
// result = true
```

### dump() :
Returns a description of the Merkle tree for distribution. It contains all the necessary information to reproduce the tree, find the relevant leaves, and generate proofs. You should distribute this to users in a web application so they can generate proofs for some leaves.
```typescript
fs.writeFileSync('data/treeTestPoseidon.json', JSON.stringify(tree.dump(),undefined,2));
```

### load() :
Loads the tree from a description previously saved or dumped.
```typescript
const tree = Merkle.StarknetMerkleTree.load(
    JSON.parse(fs.readFileSync('./src/scripts/merkleTree/treeTestPoseidon.json', 'ascii'))
);
```

###  validate() :
Verify the consistency of the tree. Useful after a load(). Take care that this method is time-consuming. Throw an error if validation fail.
```typescript
tree.validate();
```

### root :
The root of the tree is a commitment on the values of the tree. It can be published in a smart contract, to later prove that its values are part of the tree.
```typescript
console.log(tree.root);
// result = 0x4bad3f80e8041eb3d32432fa4aed9f904db8c8ab34109879a99da696a0c5a81
```

### render() :
Returns a visual representation of the tree that can be useful for debugging.
```typescript
console.log(tree.render());
// result = 
0) 0x4bad3f80e8041eb3d32432fa4aed9f904db8c8ab34109879a99da696a0c5a81
├─ 1) 0x4f9ffba9cb60723ecb53299f6b2359a9d32a1aa316ffcf83022c58d822abc55
│  ├─ 3) 0x1cd0fa9d323f2de54979140bab80cb8077ac24e098c685da5ac6a4d9a17c25c
│  │  ├─ 7) 0x6e5bfc0a35b74af4395c2a60a7735c0f0cbcfba515e91d4edd3f7ea70287cbc
│  │  └─ 8) 0x40a6dba21b22596e979a1555a278ca58c11b5cd5e46f5801c1af8c4ab518845
│  └─ 4) 0x7957d036cf1e60858a601df12e0fb2921114d4b5facccf638163e0bb2be3c34
└─ 2) 0x12677ed42d2f73c92413c30d04d0b88e771bf2595c7060df46f095f2132eca2
   ├─ 5) 0x77dc74ab2217383b4c2a772e491f8177277af576fd426f8c59f9c64d7ef258b
   └─ 6) 0x707142fb4ad00584910740c7d8207669b429cb93ce1985870b5fa5096ced91c
```

### getInputData() :
return the nth data used for the tree creation.
```typescript
const data= tree.getInputData(3);
// result = ['0x7e00d496e324876bbc8531f2d9a82bf154d1a04a50218ee74cdd372f75a551a', '26', '0']
```

### hashDataToHex() :

Hash a leaf. Returns an hex string.
```typescript
const leaf: InputForMerkle = ['0x7e00d496e324876bbc8531f2d9a82bf154d1a04a50218ee74cdd372f75a551a', '26', '0'];
const hashedLeaf: string = Merkle.hashDataToHex(leaf, Merkle.HashType.Pedersen);
// result = 0x6e5bfc0a35b74af4395c2a60a7735c0f0cbcfba515e91d4edd3f7ea70287cbc
```
> Identical to `Merkle.StarknetMerkleTree.leafHash()` .
> `Merkle.hashDataToBigint()` is similar, with a `bigint` result.

### computePoseidonHashOnElements() :

Calculate the Poseidon hash of an array of hex strings.
```typescript
const hash: bigint = Merkle.computePoseidonHashOnElements(["0x10e", "0xc4", "0x1c"]);
```

### hashPair() :

Calculate the hash of 2 bigint.

```typescript
const hash: bigint = Merkle.hashPair(200n, 300n, Merkle.HashType.Pedersen);
```

## ⚖️ License :

MIT

## 🙏 Inspiration :

Documentation and this code from OpenZeppelin were an inspiration : [repo](https://github.com/OpenZeppelin/merkle-tree)
