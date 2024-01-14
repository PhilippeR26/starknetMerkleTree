import { ec, num, encode } from 'starknet';

// ***************************************************************
// StarknetMerkleTree, inspired by an Openzeppelin version for Ethereum, adapted for Starknet.js
// https://github.com/OpenZeppelin/merkle-tree v1.0.2

/**
 * input format for the creation of a merkle tree.
 * Strings have to be HexStrings("0x1a6") or DecimalStrings("374").
 */
export type InputForMerkle = string | string[];

interface ValueAndHash {
  val: InputForMerkle;
  valueInd: number;
  hash: bigint;
}

export enum HashType {
  Pedersen = "Pedersen",
  Poseidon = "Poseidon",
}

/**
 * Output format for the storage of a merkle tree.
 * Strings have to be HexStrings("0x1a6") or DecimalStrings("374").
 */
export interface StarknetMerkleTreeData {
  /** version of the storage format */
  format: 'standard-v2',
  /** hash of each node of the tree */
  tree: string[],
  /** values of the tree leaves */
  values: {
    /** content of each leaf */
    value: InputForMerkle,
    /** position in the tree */
    treeIndex: number,
  }[],
  hashLookup: { [hash: string]: number },
  hashType: HashType,
}

function throwError(message?: string): never {
  throw new Error(message);
}

const leftChildIndex = (i: number) => 2 * i + 1;
const rightChildIndex = (i: number) => 2 * i + 2;

/**
 * Calculate the hash of 2 values, ordered before calculation.
 *
 * @param a - first value.
 * @param b - second value.
 * @param hashType - optional. The type of hash : HashType.Pedersen (by default) or HashType.Poseidon.
 * @returns the hash of these data
 * @example
 * ```typescript
 * const hash = merkle.hasPair(34447789n, 158953n));
 * }
 * ```
 */
export const hashPair = (a: bigint, b: bigint, hashType: HashType = HashType.Pedersen) =>
  BigInt(a) - BigInt(b) >= 0n
    ? num.toBigInt(hashType == HashType.Pedersen ? ec.starkCurve.pedersen(b, a) : ec.starkCurve.poseidonHashMany([b, a]))
    : num.toBigInt(hashType == HashType.Pedersen ? ec.starkCurve.pedersen(a, b) : ec.starkCurve.poseidonHashMany([a, b]));

/**
 * Compute Poseidon hash from data
 *  @param data - Array of hex string.
 * @returns format: bigint - poseidon hash
 */
export function computePoseidonHashOnElements(data: string[]): bigint {
  const dataBigint = data.map((val) => BigInt(val));
  return ec.starkCurve.poseidonHashMany([0n,...dataBigint, BigInt(dataBigint.length)]);
}

/**
 * Calculate the hash of data formatted in {@link InputForMerkle}
 * and returns a HexString.
 *
 * @param data - array of Hex string
 * @param hashType - optional. The type of hash : HashType.Pedersen (by default) or HashType.Poseidon.
 * @returns the hash of these data in HexString format
 * @example
 * ```typescript
 * const hashHex = merkle.hashDataToHex(["0x23a56e","0x1e54","0x34cc65"]), HashType.Pedersen);
 * }
 * ```
 */
export function hashDataToHex(data: InputForMerkle, hashType: HashType = HashType.Pedersen): string {
  let aa: string[] = [];
  if (Array.isArray(data)) {
    aa = data;
  } else {
    aa.push(data);
  }
  return encode.addHexPrefix(hashType == HashType.Pedersen ? ec.starkCurve.computeHashOnElements(aa).toString(16) : computePoseidonHashOnElements(aa).toString(16));
}

/**
 * Calculate the hash of data formatted in {@link InputForMerkle}
 * and returns a bigint.
 *
 * @param data - array of Hex string
 * @param hashType - optional. The type of hash : HashType.Pedersen (by default) or HashType.Poseidon.
 * @returns the hash of these data in bigint format
 * @example
 * ```typescript
 * const hashBigint = merkle.hashDataToBigint("0x23a5765C332d8f6e"), HashType.Pedersen);
 * }
 * ```
 */
export function hashDataToBigint(data: InputForMerkle, hashType: HashType = HashType.Pedersen): bigint {
  let aa: string[] = [];
  if (Array.isArray(data)) {
    aa = data;
  } else {
    aa.push(data);
  }
  return hashType == HashType.Pedersen ? BigInt(ec.starkCurve.computeHashOnElements(aa) as string) : computePoseidonHashOnElements(aa);
}

function makeMerkleTree(leaves: bigint[], hashType: HashType = HashType.Pedersen): bigint[] {
  if (leaves.length === 0) {
    throw new Error('Expected non-zero number of leaves');
  }
  const tree = new Array<bigint>(2 * leaves.length - 1);
  // eslint-disable-next-line no-restricted-syntax
  for (const [i, leaf] of leaves.entries()) {
    tree[tree.length - 1 - i] = leaf;
  }
  for (let i = tree.length - 1 - leaves.length; i >= 0; i -= 1) {
    tree[i] = hashPair(tree[leftChildIndex(i)], tree[rightChildIndex(i)],hashType);
  }
  return tree;
}

function isValidMerkleTree(tree: bigint[], hashType: HashType = HashType.Pedersen): boolean {
  // eslint-disable-next-line no-restricted-syntax
  for (const [i, node] of tree.entries()) {
    const l = leftChildIndex(i);
    const r = rightChildIndex(i);
    if (r >= tree.length) {
      if (l < tree.length) {
        return false;
      }
    } else if (!(node === hashPair(tree[l], tree[r]),hashType)) {
      return false;
    }
  }
  return tree.length > 0;
}

const isTreeNode = (tree: bigint[], i: number) => i >= 0 && i < tree.length;
const isInternalNode = (tree: bigint[], i: number) => isTreeNode(tree, leftChildIndex(i));
const isLeafNode = (tree: bigint[], i: number) => isTreeNode(tree, i) && !isInternalNode(tree, i);
const checkLeafNode = (tree: bigint[], i: number) =>
  isLeafNode(tree, i) || throwError('Index is not a leaf');
const parentIndex = (i: number) =>
  i > 0 ? Math.floor((i - 1) / 2) : throwError('Root has no parent');
const siblingIndex = (i: number) =>
  i > 0 ? i - (-1) ** (i % 2) : throwError('Root has no siblings');

function getProof(tree: bigint[], index: number): bigint[] {
  checkLeafNode(tree, index);
  // eslint-disable-next-line prefer-const
  let idx = index;
  const proof: bigint[] = [];
  while (idx > 0) {
    proof.push(tree[siblingIndex(idx)]!);
    idx = parentIndex(idx);
  }
  return proof;
}

function biToHex(b: bigint): string {
  return encode.addHexPrefix(b.toString(16));
}

function processProof(leaf: bigint, proof: bigint[], hashType: HashType): bigint {
  return proof.reduce((x, y) => hashPair(x, y, hashType), leaf);
}

function renderMerkleTree(tree: bigint[]): string {
  if (tree.length === 0) {
    throw new Error('Expected non-zero number of nodes');
  }
  const stack: [number, number[]][] = [[0, []]];
  const lines = [];
  while (stack.length > 0) {
    const [i, path] = stack.pop()!;
    lines.push(
      // eslint-disable-next-line prefer-template
      path
        .slice(0, -1)
        .map((p) => ['   ', '│  '][p])
        .join('') +
      path
        .slice(-1)
        .map((p) => ['└─ ', '├─ '][p])
        .join('') +
      i +
      ') ' +
      encode.addHexPrefix(tree[i].toString(16))
    );
    if (rightChildIndex(i) < tree.length) {
      stack.push([rightChildIndex(i), path.concat(0)]);
      stack.push([leftChildIndex(i), path.concat(1)]);
    }
  }
  return lines.join('\n');
}

/**
 * Class for handling Merkle trees.
 */
export class StarknetMerkleTree {
  private constructor(
    private readonly tree: bigint[],
    private readonly values: { value: InputForMerkle; treeIndex: number }[],
    private readonly hashLookup: { [hash: string]: number },
    private readonly hashType: HashType= HashType.Pedersen
  ) { }

  private static adaptInputItem(element: string): string {
    return num.getHexString(element);
  }

  /**
   * Creates a standard Merkle tree out of an array.
   *
   * @param values - the content of each leaf of the tree.
   * @param hashType - the type of hash : HashType.Pedersen or HashType.Poseidon.
   *
   * @returns a Merkle tree object
   * @example
   * ```typescript
   * const data: merkle.inputForMerkle[] = [
   *   ['0x69b49c2cc8b16e80e86bfc5b0614a59aa8c9b601569c7b80dde04d3f3151b79', '256'],
   *   ['0x3cad9a072d3cf29729ab2fad2e08972b8cfde01d4979083fb6d15e8e66f8ab1', '25'],
   *   ['0x27d32a3033df4277caa9e9396100b7ca8c66a4ef8ea5f6765b91a7c17f0109c', '56'],
   *   ['0x7e00d496e324876bbc8531f2d9a82bf154d1a04a50218ee74cdd372f75a551a', '26'],
   *   ['0x53c615080d35defd55569488bc48c1a91d82f2d2ce6199463e095b4a4ead551', '56'],
   * ];
   * const tree = merkle.StarknetMerkleTree.create(data);
   * ```
   */
  static create(values: InputForMerkle[], hashType: HashType = HashType.Pedersen): StarknetMerkleTree {
    // verification of inputs
    const checkedValues = values.map((item: InputForMerkle) => {
      if (typeof item === 'string') {
        return StarknetMerkleTree.adaptInputItem(item);
      }
      return item.map(StarknetMerkleTree.adaptInputItem);
    });
    // calculate and store
    const hashedValues = checkedValues
      .map(
        (value, valueIndex) =>
          ({ val: value, valueInd: valueIndex, hash: hashDataToBigint(value,hashType) } as ValueAndHash)
      )
      .sort((a, b) => (a.hash - b.hash >= 0n ? 1 : -1));
    const tree = makeMerkleTree(hashedValues.map((v) => v.hash),hashType);

    const indexedValues = checkedValues.map((value) => ({ value, treeIndex: 0 }));
    // eslint-disable-next-line no-restricted-syntax
    for (const [leafIndex, { valueInd }] of hashedValues.entries()) {
      indexedValues[valueInd].treeIndex = tree.length - leafIndex - 1;
    }
    const mapping = checkedValues.map((value, valueIndex) => {
      return [hashDataToHex(value,hashType), valueIndex];
    });
    const hashLookup = Object.fromEntries(mapping);
    return new StarknetMerkleTree(tree, indexedValues, hashLookup, hashType);
  }

  /**
   * return the nth data used for the tree creation.
   *
   * @param pos - input data order (0 first).
   * @returns
   * @example
   * ```typescript
   * const data= tree.getInputData(3);
   * ```
   */
  getInputData(pos: number): InputForMerkle {
    return this.values[pos].value;
  }

  /**
   * Loads the tree from a description previously returned by {@link dump}.
   *
   * @param data - storage of Merkle tree.
   * @returns - a merkle tree description
   * @example
   * ```typescript
   * StarknetMerkleTree.load(JSON.parse(fs.readFileSync('tree.json','ascii')));
   * ```
   */
  static load(data: StarknetMerkleTreeData): StarknetMerkleTree {
    if (data.format !== 'standard-v2') {
      throw new Error(`Unknown format '${data.format}'`);
    }
    return new StarknetMerkleTree(data.tree.map(BigInt), data.values, data.hashLookup, data.hashType);
  }

  /**
   * Returns a description of the merkle tree for distribution.
   * It contains all the necessary information to reproduce the tree,
   * find the relevant leaves, and generate proofs.
   * You should distribute this to users in a web application
   * so they can generate proofs for their leaves of interest.
   *
   * @returns - a merkle tree description
   * @example
   * ```typescript
   * fs.writeFileSync('tree.json', JSON.stringify(tree.dump(),undefined,2));
   * ```
   */
  dump(): StarknetMerkleTreeData {
    return {
      format: 'standard-v2',
      tree: this.tree.map(biToHex),
      values: this.values,
      hashLookup: this.hashLookup,
      hashType: this.hashType==HashType.Pedersen? HashType.Pedersen:HashType.Poseidon,
    };
  }

  /**
   * Returns a visual representation of the tree that can be useful for debugging.
   *
   * @returns string containing the result.
   * @example
   * ```typescript
   * console.log(tree.render());
   * ```
   */
  render() {
    return renderMerkleTree(this.tree);
  }

  /**
   * The root of the tree is a commitment on the values of the tree. It can be
   * published in a smart contract, to later prove that its values are part
   * of the tree.
   *
   * @returns an HexString ("0x1e3")
   * @example
   * ```typescript
   * console.log(tree.root);
   * ```
   */
  get root(): string {
    return encode.addHexPrefix(this.tree[0].toString(16));
  }

  /**
   * Lists the values in the tree along with their indices,
   * which can be used to obtain proofs.
   *
   * @example
   * ```typescript
   * for (const [i, v] of tree.entries()) {
   * console.log('value:', v);
   * console.log('proof:', tree.getProof(i));
   * }
   * ```
   */
  *entries(): Iterable<[number, InputForMerkle]> {
    // eslint-disable-next-line no-restricted-syntax
    for (const [i, { value }] of this.values.entries()) {
      yield [i, value];
    }
  }

  /**
   * Verify the consistency of the tree. Useful after a load().
   * Take care that this method is time-consuming.
   * Throw an error if validation fail.
   * @example
   * ```typescript
   * tree.validate();
   * ```
   */
  validate() {
    for (let i = 0; i < this.values.length; i += 1) {
      this.validateValue(i);
    }
    if (!isValidMerkleTree(this.tree,this.hashType)) {
      throw new Error('Merkle tree is invalid');
    }
  }

  /**
   * Returns the leaf hash of the value.
   *
   * @param leaf - the data contained in a leaf.
   * @param hashType - The type of hash : HashType.Pedersen or HashType.Poseidon.
   * @returns the hash of these data, stored at the base of the tree.
   * @example
   * ```typescript
   * const leaf = merkle.leafHash(["0x1e6f3", '100'], HashType.Pedersen);
   * }
   * ```
   */
  static leafHash(leaf: InputForMerkle, hashType: HashType ): string {
    if (typeof leaf === 'string') {
      return hashDataToHex(StarknetMerkleTree.adaptInputItem(leaf),hashType);
    }
    const adaptedLeaf = leaf.map(StarknetMerkleTree.adaptInputItem) as string[];
    return hashDataToHex(adaptedLeaf,hashType);
  }

  private leafLookup(leaf: InputForMerkle): number {
    return (
      this.hashLookup[StarknetMerkleTree.leafHash(leaf,this.hashType)] ??
      throwError(`'This leaf is not in tree': ${leaf}`)
    );
  }

  /**
   * Returns a proof for the ith value in the tree. Indices refer to
   * the position of the values in the array from which the tree was constructed.
   * Also accepts a value instead of an index, but this will be less efficient.
   * It will fail if the value is not found in the tree.
   *
   * @param leaf - the position of construction, or the data contained in a leaf.
   * @returns the proof, to provide to the smart-contract.
   * @example
   * ```typescript
   * const proof = tree.getProof(3);
   * const proof = tree.getProof(["0x43af5", '100']);
   * }
   * ```
   */
  getProof(leaf: number | InputForMerkle): string[] {
    const valueIndex = typeof leaf === 'number' ? leaf : this.leafLookup(leaf);
    this.validateValue(valueIndex);
    // rebuild tree index and generate proof
    const { treeIndex } = this.values[valueIndex]!;
    const proof: bigint[] = getProof(this.tree, treeIndex);
    // sanity check proof
    if (!this.internVerify(this.tree[treeIndex], proof)) {
      throw new Error('Unable to prove value');
    }
    return proof.map(biToHex);
  }

  /**
   * Returns a boolean that is `true` when the proof verifies that
   * the value is contained in the tree.
   * @remarks
   * This job is normally made by the smart-contract.
   * Present here just to be able to check in the DAPP.
   *
   * @param leaf - the position of construction, or the data contained in a leaf.
   * @param proof - proof obtained with {@link getProof}.
   * @returns verification that the leaf is present in the tree,
   * without using the tree content.
   * @example
   * ```typescript
   * const result = tree.verify(3, proof);
   * const result = tree.verify(["0x34e67d", '100'], proof);
   * ```
   */
  verify(leaf: number | InputForMerkle, proof: string[]): boolean {
    const adaptedProof = proof.map(StarknetMerkleTree.adaptInputItem) as string[];
    return this.internVerify(this.getLeafHash(leaf), adaptedProof.map(BigInt));
  }

  private internVerify(leafHash: bigint, proof: bigint[]): boolean {
    const impliedRoot = processProof(leafHash, proof, this.hashType);
    return impliedRoot === this.tree[0];
  }

  private checkBounds(array: unknown[], index: number) {
    if (index < 0 || index >= array.length) {
      throw new Error('Index out of bounds');
    }
  }

  private validateValue(valueIndex: number): bigint {
    this.checkBounds(this.values, valueIndex);
    const { value, treeIndex } = this.values[valueIndex];
    this.checkBounds(this.tree, treeIndex);
    const leafHash: bigint = hashDataToBigint(value,this.hashType);
    if (!(leafHash === this.tree[treeIndex])) {
      throw new Error('Merkle tree does not contain the expected value');
    }
    return leafHash;
  }

  private getLeafHash(leaf: number | InputForMerkle): bigint {
    if (typeof leaf === 'number') {
      return this.validateValue(leaf);
    }
    if (typeof leaf === 'string') {
      return hashDataToBigint(StarknetMerkleTree.adaptInputItem(leaf),this.hashType);
    }
    const adaptedLeaf = leaf.map(StarknetMerkleTree.adaptInputItem) as string[];
    return hashDataToBigint(adaptedLeaf,this.hashType);
  }
}
