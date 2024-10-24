/* eslint-disable */
import {
  Address,
  beginCell,
  Cell,
  Contract,
  ContractProvider,
} from "@ton/core";

export class JettonWallet implements Contract {
  constructor(
    readonly address: Address,
    readonly init?: { code: Cell; data: Cell },
  ) {}

  static createFromAddress(address: Address) {
    return new JettonWallet(address);
  }

  async getJettonBalance(provider: ContractProvider) {
    let state = await provider.getState();
    if (state.state.type !== "active") {
      return 0n;
    }
    let res = await provider.get("get_wallet_data", []);
    return res.stack.readBigNumber();
  }
  static transferMessage(
    jetton_amount: bigint,
    to: Address,
    responseAddress: Address,
    customPayload: Cell | null,
    forward_ton_amount: bigint,
    forwardPayload: Cell | null,
  ) {
    return beginCell()
      .storeUint(0xf8a7ea5, 32)
      .storeUint(0, 64) // op, queryId
      .storeCoins(jetton_amount)
      .storeAddress(to)
      .storeAddress(responseAddress)
      .storeMaybeRef(customPayload)
      .storeCoins(forward_ton_amount)
      .storeMaybeRef(forwardPayload)
      .endCell();
  }
}
