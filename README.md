<h1 style="text-align: center;"> Starknet Merkle Tree</h1>
 
<p align="center">
  <img src="./public/tree.jpg" />
</p>

<h2 style="text-align: center;"> Typescript library for Merkle trees adapted for Starknet</h1>
<br></br>

**This library has not been audited ; use at your own risks.**

This library is able to create Merkle trees, using very efficient and specifics hashes for the Starknet blockchain. You can use :
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
    ];
const tree = Merkle.StarknetMerkleTree.create(airdrop, Merkle.HashType.Poseidon);
```

### 🎰 Create a Merkle proof :
```typescript
const inp = 3; // Nth leaf of the input list
const proof = tree.getProof(inp);
```

### Hash a leaf :
```typescript
const inpData = tree.getInputData(inp);
const leafHash = Merkle.StarknetMerkleTree.leafHash(inpData, Merkle.HashType.Poseidon);
```
### 🔎 Verify a proof with Starknet.js :
```typescript
const inpData = tree.getInputData(inp);
const isValid = tree.verify(inpData, proof);
```

### 🔎 Verify a proof in the Starknet blockchain :

A dedicated smart-contract is created, including only one value of the tree : the root. You send a proof (few numbers) to this contract, and it can say if an address is included in the tree or not. Just by storing a felt252 in Starknet, you can check that an address is included in a list of thousand of addresses, and trigger a distribution of token to this address.
> A Cairo 1 smart-contract is in preparation and will be released soon. It will show how to verify a Merkle proof in Starknet. Stay tune ; just need a couple of weeks to release it.

> Additional scripts will be released soon.

> A demo DAPP for an Airdrop is in preparation, and will be listed here.

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
```

### verify() :
Returns a boolean that is `true` when the proof verifies that the value is contained in the tree.
```typescript
const result1 = tree.verify(3, proof);
const result2 = tree.verify(["0x34e67d", '100'], proof);
```

### dump() :
Returns a description of the merkle tree for distribution. It contains all the necessary information to reproduce the tree, find the relevant leaves, and generate proofs. You should distribute this to users in a web application so they can generate proofs for their leaves of interest.
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
```

### render() :
Returns a visual representation of the tree that can be useful for debugging.
```typescript
console.log(tree.render());
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
const leaf: InputForMerkle = ['0x27d32a3033df4277caa9e9396100b7ca8c66a4ef8ea5f6765b91a7c17f0109c', '56','0'];
const hashedLeaf: string = Merkle.hashDataToHex(leaf, Merkle.HashType.Pedersen);
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
const hash: bigint = Merkle.hashPair(200n, 300n,Merkle.HashType.Pedersen);
```

## ⚖️ License :

MIT

## 🙏 Inspiration :

Documentation and this code from OpenZeppelin were an inspiration : [repo](https://github.com/OpenZeppelin/merkle-tree)
