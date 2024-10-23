/* eslint-disable */
import {
  Address,
  beginCell,
  Cell,
  Contract,
  ContractProvider,
  Sender,
  SendMode,
  toNano,
} from "@ton/core";

import { Op } from "./jetton_constants";

export class JettonMinter implements Contract {
  constructor(
    readonly address: Address,
    readonly init?: { code: Cell; data: Cell },
  ) {}

  static createFromAddress(address: Address) {
    return new JettonMinter(address);
  }

  static mintMessage(
    response_addr: Address,
    to: Address,
    jetton_amount: bigint,
    forward_ton_amount: bigint,
    total_ton_amount: bigint,
    query_id: number | bigint = 0,
  ) {
    const mintMsg = beginCell()
      .storeUint(Op.internal_transfer, 32)
      .storeUint(0, 64)
      .storeCoins(jetton_amount)
      .storeAddress(null)
      .storeAddress(response_addr) // Response addr
      .storeCoins(forward_ton_amount)
      .storeMaybeRef(null)
      .endCell();

    return beginCell()
      .storeUint(Op.mint, 32)
      .storeUint(query_id, 64) // op, queryId
      .storeAddress(to)
      .storeCoins(total_ton_amount)
      .storeCoins(jetton_amount)
      .storeRef(mintMsg)
      .endCell();
  }

  async sendMint(
    provider: ContractProvider,
    via: Sender,
    to: Address,
    jetton_amount: bigint,
    forward_ton_amount: bigint,
    total_ton_amount: bigint,
  ) {
    if (total_ton_amount <= forward_ton_amount) {
      throw new Error("Total ton amount should be > forward amount");
    }
    await provider.internal(via, {
      sendMode: SendMode.PAY_GAS_SEPARATELY,
      body: JettonMinter.mintMessage(
        this.address,
        to,
        jetton_amount,
        forward_ton_amount,
        total_ton_amount,
      ),
      value: total_ton_amount + toNano("0.015"),
    });
  }

  async getWalletAddress(
    provider: ContractProvider,
    owner: Address,
  ): Promise<Address> {
    const res = await provider.get("get_wallet_address", [
      { type: "slice", cell: beginCell().storeAddress(owner).endCell() },
    ]);
    return res.stack.readAddress();
  }

  async getJettonData(provider: ContractProvider) {
    let res = await provider.get("get_jetton_data", []);
    let totalSupply = res.stack.readBigNumber();
    let mintable = res.stack.readBoolean();
    let adminAddress = res.stack.readAddress();
    let content = res.stack.readCell();
    let walletCode = res.stack.readCell();
    return {
      totalSupply,
      mintable,
      adminAddress,
      content,
      walletCode,
    };
  }

  async getTotalSupply(provider: ContractProvider) {
    let res = await this.getJettonData(provider);
    return res.totalSupply;
  }
}
