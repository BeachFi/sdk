/**
 * Directly copied from https://github.com/redstone-finance/redstone-oracles-monorepo/blob/281e41517a54ae0d9a9c0c30c39d0ccf15950d68/packages/ton-connector/src/create-payload-cell.ts
 * because it's not exported from the package
 */

import { consts } from "@redstone-finance/protocol";
import { beginCell, Builder } from "@ton/core";
import { serializeDict } from "@ton/core/dist/dict/serializeDict";
import { arrayify } from "ethers/lib/utils";
import { splitPayloadHex } from "./split-payload-hex";
import { createBuilderFromString } from "./ton-utils";
import { assert } from "../../utils";

export const BASE_KEY_LEN = 16;

export function createPayloadCell(payloadHex: string) {
  const { dataPackageChunks, metadata } = splitPayloadHex(payloadHex);

  const payloadCell = beginCell();
  const cells = new Map<bigint, string>();
  for (let i = 0; i < dataPackageChunks.length; i++) {
    cells.set(BigInt(i), dataPackageChunks[i]!);
  }

  const dataPackagesDict = beginCell();
  serializeDict(cells, BASE_KEY_LEN, storeSignatureAndData, dataPackagesDict);

  payloadCell.storeRef(dataPackagesDict);
  storeMetadata(metadata, payloadCell);

  return payloadCell.endCell();
}

function storeMetadata(metadataHex: string, builder: Builder) {
  const maxUnsignedDataLength = Math.floor(
    builder.availableBits / 8 -
      (consts.REDSTONE_MARKER_BS +
        consts.DATA_PACKAGES_COUNT_BS +
        consts.UNSIGNED_METADATA_BYTE_SIZE_BS),
  );

  assert(
    builder.availableBits >= metadataHex.length * 8,
    `Not enough bits available for metadata in builder. Unsigned metadata for this payload must not be larger than ${maxUnsignedDataLength}.`,
  );

  builder.storeBuilder(createBuilderFromString(metadataHex));
}

function storeSignatureAndData(dataPackageHex: string, builder: Builder) {
  const data = dataPackageHex.substring(
    0,
    dataPackageHex.length - 2 * consts.SIGNATURE_BS,
  );
  const signature = dataPackageHex.substring(
    dataPackageHex.length - 2 * consts.SIGNATURE_BS,
    dataPackageHex.length,
  );

  const v = BigInt("0x" + signature.substring(128, 130));
  assert([27, 28].map(BigInt).includes(v), `Wrong signature 'v' value (${v})`);

  const signatureCell = beginCell()
    .storeUint(BigInt("0x" + signature.substring(0, 64)), 256)
    .storeUint(BigInt("0x" + signature.substring(64, 128)), 256)
    .storeUint(v, 8)
    .endCell();

  console.assert(data.length / 2 <= 127, "Must be implemented for larger data");

  const dataCell = beginCell()
    .storeBuffer(Buffer.from(arrayify("0x" + data)))
    .endCell();

  builder.storeSlice(signatureCell.beginParse()).storeRef(dataCell);
}
