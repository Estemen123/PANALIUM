import { encodeFunctionData, erc20Abi, formatEther, formatUnits, parseEther, parseUnits } from 'viem';
import { publicClient, explorerTxUrl, fujiTransport } from '../config/chain.js';
import { isAdminUid } from '../middleware/auth.js';
import { getMasterAddress, sendCallsAsMaster } from './masterWallet.js';
import { getKernelClient, withAccountLock } from './smartAccount.js';

/**
 * Wallet con la que opera el usuario: el admin usa la wallet master (EOA, paga su gas);
 * el resto, su smart account de ZeroDev (UserOps patrocinadas).
 */
export async function resolveUserWallet(uid) {
  if (await isAdminUid(uid)) return { kind: 'master', address: getMasterAddress() };
  const client = await getKernelClient(uid);
  return { kind: 'smart', address: client.account.address };
}

/** Info general de la wallet del usuario. */
export async function getAccountInfo(uid) {
  const { kind, address } = await resolveUserWallet(uid);

  const [balance, bytecode] = await Promise.all([
    publicClient.getBalance({ address }),
    publicClient.getCode({ address }),
  ]);

  return {
    kind,
    address,
    // Una EOA no tiene bytecode: para la master "desplegada" siempre es verdadero.
    deployed: kind === 'master' || Boolean(bytecode && bytecode !== '0x'),
    balance: { wei: balance.toString(), avax: formatEther(balance) },
  };
}

/** Balance y metadata de un token ERC-20. */
export async function getTokenBalance(uid, token) {
  const { address } = await resolveUserWallet(uid);

  const [balance, decimals, symbol] = await Promise.all([
    publicClient.readContract({ address: token, abi: erc20Abi, functionName: 'balanceOf', args: [address] }),
    publicClient.readContract({ address: token, abi: erc20Abi, functionName: 'decimals' }),
    publicClient.readContract({ address: token, abi: erc20Abi, functionName: 'symbol' }),
  ]);

  return {
    token,
    symbol,
    decimals,
    raw: balance.toString(),
    formatted: formatUnits(balance, decimals),
  };
}

/**
 * Envia una lista de calls como una sola UserOp patrocinada.
 * calls: [{ to, value?: bigint, data?: '0x...' }]
 */
async function sendCalls(uid, calls, { waitForReceipt = true } = {}) {
  if (await isAdminUid(uid)) {
    return sendCallsAsMaster({ client: publicClient, transport: fujiTransport, explorerTxUrl, calls, waitForReceipt });
  }
  return withAccountLock(uid, async () => {
    const client = await getKernelClient(uid);

    const userOpHash = await client.sendUserOperation({
      callData: await client.account.encodeCalls(calls),
    });

    if (!waitForReceipt) {
      return { userOpHash, status: 'pending' };
    }

    const receipt = await client.waitForUserOperationReceipt({
      hash: userOpHash,
      timeout: 90_000,
    });

    return {
      userOpHash,
      status: receipt.success ? 'success' : 'reverted',
      transactionHash: receipt.receipt.transactionHash,
      blockNumber: receipt.receipt.blockNumber.toString(),
      actualGasUsed: receipt.actualGasUsed?.toString(),
      explorerUrl: explorerTxUrl(receipt.receipt.transactionHash),
    };
  });
}

/** Transferencia de AVAX nativo desde la smart account. */
export async function sendNative(uid, { to, amountAvax, waitForReceipt }) {
  return sendCalls(uid, [{ to, value: parseEther(String(amountAvax)), data: '0x' }], { waitForReceipt });
}

/** Transferencia de un ERC-20 desde la smart account. */
export async function sendErc20(uid, { token, to, amount, waitForReceipt }) {
  const decimals = await publicClient.readContract({
    address: token,
    abi: erc20Abi,
    functionName: 'decimals',
  });

  const data = encodeFunctionData({
    abi: erc20Abi,
    functionName: 'transfer',
    args: [to, parseUnits(String(amount), decimals)],
  });

  return sendCalls(uid, [{ to: token, value: 0n, data }], { waitForReceipt });
}

/** Llamada arbitraria a un contrato (ABI + funcion + args). */
export async function callContract(uid, { address, abi, functionName, args = [], value = '0', waitForReceipt }) {
  const data = encodeFunctionData({ abi, functionName, args });
  return sendCalls(uid, [{ to: address, value: BigInt(value), data }], { waitForReceipt });
}

/** Varias operaciones en una sola UserOp (batching, una de las ventajas de AA). */
export async function sendBatch(uid, { calls, waitForReceipt }) {
  const encoded = calls.map((c) => ({
    to: c.to,
    value: BigInt(c.value ?? '0'),
    data: c.abi
      ? encodeFunctionData({ abi: c.abi, functionName: c.functionName, args: c.args ?? [] })
      : (c.data ?? '0x'),
  }));
  return sendCalls(uid, encoded, { waitForReceipt });
}

/** Estado de una UserOp ya enviada. */
export async function getUserOperationStatus(uid, userOpHash) {
  if (await isAdminUid(uid)) {
    // La master no manda UserOps: el "hash" es el de la transaccion.
    const receipt = await publicClient.getTransactionReceipt({ hash: userOpHash }).catch(() => null);
    if (!receipt) return { userOpHash, status: 'pending' };
    return {
      userOpHash,
      status: receipt.status === 'success' ? 'success' : 'reverted',
      transactionHash: receipt.transactionHash,
      explorerUrl: explorerTxUrl(receipt.transactionHash),
    };
  }
  const client = await getKernelClient(uid);
  try {
    const receipt = await client.getUserOperationReceipt({ hash: userOpHash });
    if (!receipt) return { userOpHash, status: 'pending' };
    return {
      userOpHash,
      status: receipt.success ? 'success' : 'reverted',
      transactionHash: receipt.receipt.transactionHash,
      explorerUrl: explorerTxUrl(receipt.receipt.transactionHash),
    };
  } catch {
    return { userOpHash, status: 'pending' };
  }
}
