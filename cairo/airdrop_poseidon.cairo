// Example of Airdrop contract
// Coded with Cairo 2.4.0 
// contract not audited ; use at your own risks.

use starknet::ContractAddress;

#[starknet::interface]
trait IMerkleVerify<TContractState> {
    fn get_merkle_address(self: @TContractState) -> ContractAddress;
    fn get_time(self: @TContractState) -> u64;
    fn is_address_airdropped(self: @TContractState, address: ContractAddress) -> bool;
    fn request_airdrop(
        ref self: TContractState, address: ContractAddress, amount: u256, proof: Array<felt252>
    );
}

#[starknet::contract]
mod merkle_verify {
    use core::option::OptionTrait;
    use super::IMerkleVerify;
    use starknet::{ContractAddress, SyscallResultTrait, contract_address_const};
    use starknet::get_block_timestamp;
    use core::poseidon::poseidon_hash_span;
    use core::hash::HashStateExTrait;
    use poseidon::{PoseidonTrait, HashState};
    use hash::{HashStateTrait, Hash};
    use array::{ArrayTrait, SpanTrait};

    #[storage]
    struct Storage {
        erc20_address: ContractAddress,
        start_time: u64,
        merkle_address: ContractAddress,
        merkle_root: felt252,
        airdrop_performed: LegacyMap::<ContractAddress, bool>,
    }

    #[constructor]
    fn constructor(
        ref self: ContractState,
        erc20_address: ContractAddress,
        merkle_address: ContractAddress,
        start_time: u64,
    ) {
        self.erc20_address.write(erc20_address);
        self.merkle_address.write(merkle_address);
        self.start_time.write(start_time);
    }

    #[external(v0)]
    impl MerkleVerifyContract of super::IMerkleVerify<ContractState> {
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

            assert(is_request_valid, 'Proof not valid.'); // revert if not valid

            // Airdrop
            // Register the address as already airdropped
            self.airdrop_performed.write(address, true);
            // to be sure to perform the airdrop only once per address.

            // Perform here your transfer of token.

            // if needed, create some events.

            return ();
        }
    }
}
