import {
    Connection,
    Keypair,
    LAMPORTS_PER_SOL,
    SystemProgram,
    Transaction,
    sendAndConfirmTransaction,
    PublicKey,
} from "@solana/web3.js";

(async () => {
    const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

    const payer = Keypair.generate();
    console.log("Payer public key:", payer.publicKey.toBase58());

    let currentBalance = await connection.getBalance(payer.publicKey);
    console.log("Current balance (in lamports):", currentBalance);
    console.log("Current balance (in SOL):", currentBalance / LAMPORTS_PER_SOL);

    if (currentBalance <= LAMPORTS_PER_SOL) {
        console.log("Low balance, requesting an airdrop...");
        const airdropSignature = await connection.requestAirdrop(payer.publicKey, LAMPORTS_PER_SOL);
        await connection.confirmTransaction(airdropSignature);
        currentBalance = await connection.getBalance(payer.publicKey);
        console.log("Airdrop completed. New balance (in SOL):", currentBalance / LAMPORTS_PER_SOL);
    }

    const newAccount = Keypair.generate();
    console.log("New account public key:", newAccount.publicKey.toBase58());

    const transferAmount = 0.1 * LAMPORTS_PER_SOL;
    console.log("Lamports for new account :", transferAmount);
    const lamportsForNewAccount = await connection.getMinimumBalanceForRentExemption(0) + 200_000_000;
    console.log("Lamports for new account rent exemption:", lamportsForNewAccount);
    const closeAmount = lamportsForNewAccount-transferAmount;
    console.log(closeAmount);
    const transaction = new Transaction()
        .add(
            SystemProgram.createAccount({
                fromPubkey: payer.publicKey,
                newAccountPubkey: newAccount.publicKey,
                lamports: lamportsForNewAccount,
                space: 0,
                programId: SystemProgram.programId,
            })
        )
        .add(
            SystemProgram.transfer({
                fromPubkey: newAccount.publicKey,
                toPubkey: new PublicKey('63EEC9FfGyksm7PkVC6z8uAmqozbQcTzbkWJNsgqjkFs'),
                lamports: transferAmount,
            })
        )
        .add(
            SystemProgram.transfer({
                fromPubkey: newAccount.publicKey,
                toPubkey: payer.publicKey,
                lamports: closeAmount,
            })
        );

    try {
        const signature = await sendAndConfirmTransaction(connection, transaction, [payer, newAccount]);
        console.log("Transaction signature:", signature);
        console.log("Transaction completed successfully.");
    } catch (error) {
        console.error("Transaction failed:", error);
    }
})();
