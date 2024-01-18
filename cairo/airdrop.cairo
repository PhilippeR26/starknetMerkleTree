// Example of Airdrop contract
// Coded with Cairo 2.4.0 
// contract not audited ; use at your own risks.

use starknet::ContractAddress;

#[starknet::interface]
trait IERC20<TContractState> {
    fn name(self: @TContractState) -> felt252;
    fn symbol(self: @TContractState) -> felt252;
    fn decimals(self: @TContractState) -> u8;
    fn totalSupply(self: @TContractState) -> u256;
    fn balanceOf(self: @TContractState, account: ContractAddress) -> u256;
    fn allowance(self: @TContractState, owner: ContractAddress, spender: ContractAddress) -> u256;
    fn transfer(ref self: TContractState, recipient: ContractAddress, amount: u256);
    fn transferFrom(
        ref self: TContractState, sender: ContractAddress, recipient: ContractAddress, amount: u256
    );
    fn approve(ref self: TContractState, spender: ContractAddress, amount: u256);
    fn increaseAllowance(ref self: TContractState, spender: ContractAddress, added_value: u256);
    fn decreaseAllowance(
        ref self: TContractState, spender: ContractAddress, subtracted_value: u256
    );
}

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

#[starknet::interface]
trait IAirdrop<TContractState> {
    fn get_merkle_address(self: @TContractState) -> ContractAddress;
    fn get_time(self: @TContractState) -> u64;
    fn is_address_airdropped(self: @TContractState, address: ContractAddress) -> bool;
    fn request_airdrop(
        ref self: TContractState, address: ContractAddress, amount: u256, proof: Array<felt252>
    );
}

#[starknet::contract]
mod airdrop {
    use super::{IERC20Dispatcher, IERC20DispatcherTrait};
    use super::{IMerkleVerifyDispatcher, IMerkleVerifyDispatcherTrait};
    use super::IAirdrop;
    use core::option::OptionTrait;
    use starknet::{ContractAddress, SyscallResultTrait, contract_address_const};
    use starknet::get_block_timestamp;
    use core::hash::HashStateExTrait;
    use hash::{HashStateTrait, Hash};
    use array::{ArrayTrait, SpanTrait};

    #[storage]
    struct Storage {
        erc20_address: ContractAddress,
        start_time: u64,
        merkle_address: ContractAddress,
        erc20_owner: ContractAddress,
        merkle_root: felt252,
        airdrop_performed: LegacyMap::<ContractAddress, bool>,
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    enum Event {
        Claimed: Claimed
    }

    #[derive(Drop, starknet::Event)]
    struct Claimed {
        address: ContractAddress,
        amount: u256
    }

    #[constructor]
    fn constructor(
        ref self: ContractState,
        erc20_address: ContractAddress,
        merkle_address: ContractAddress,
        erc20_owner: ContractAddress,
        start_time: u64,
    ) {
        self.erc20_address.write(erc20_address);
        self.merkle_address.write(merkle_address);
        self.erc20_owner.write(erc20_owner);
        self.start_time.write(start_time);
    }

    #[external(v0)]
    impl MerkleVerifyContract of super::IAirdrop<ContractState> {
        // returns the address of the merkle verify contract for this airdrop
        fn get_merkle_address(self: @ContractState) -> ContractAddress {
            self.merkle_address.read()
        }

        // returns the time of start of the airdrop
        fn get_time(self: @ContractState) -> u64 {
            get_block_timestamp()
        }

        fn is_address_airdropped(self: @ContractState, address: ContractAddress) -> bool {
            self.airdrop_performed.read(address)
        }

        fn request_airdrop(
            ref self: ContractState, address: ContractAddress, amount: u256, proof: Array<felt252>
        ) {
            let already_airdropped: bool = self.airdrop_performed.read(address);
            assert(!already_airdropped, 'Address already airdropped');
            let current_time: u64 = get_block_timestamp();
            let airdrop_start_time: u64 = self.start_time.read();
            assert(current_time >= airdrop_start_time, 'Airdrop has not started yet.');
        
            let is_request_valid: bool = IMerkleVerifyDispatcher {
                contract_address: self.merkle_address.read()
            }
                .verify_from_leaf_airdrop( address, amount, proof);
            assert(is_request_valid, 'Proof not valid.'); // revert if not valid

            // Airdrop
            // Register the address as already airdropped
            self.airdrop_performed.write(address, true);
            // to be sure to perform the airdrop only once per address.

            // Perform here your transfer of token.
            IERC20Dispatcher { contract_address: self.erc20_address.read() }
                .transferFrom(self.erc20_owner.read(), address, amount);
            // if needed, create some events.
            self.emit(Claimed { address: address, amount: amount });
            return ();
        }
    }
}
