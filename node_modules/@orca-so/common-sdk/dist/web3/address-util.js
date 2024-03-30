"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AddressUtil = void 0;
const anchor_1 = require("@project-serum/anchor");
/**
 * @category Util
 */
class AddressUtil {
    static toPubKey(address) {
        return (0, anchor_1.translateAddress)(address);
    }
    static toPubKeys(addresses) {
        return addresses.map((address) => AddressUtil.toPubKey(address));
    }
    static findProgramAddress(seeds, programId) {
        const [publicKey, bump] = anchor_1.utils.publicKey.findProgramAddressSync(seeds, programId);
        return { publicKey, bump };
    }
}
exports.AddressUtil = AddressUtil;
