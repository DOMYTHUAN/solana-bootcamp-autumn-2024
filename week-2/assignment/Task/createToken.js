import {
    Connection,
    Keypair,
    SystemProgram,
    PublicKey,
    Transaction,
    LAMPORTS_PER_SOL,
    sendAndConfirmTransaction,
} from "@solana/web3.js";
import {
    TOKEN_PROGRAM_ID,
    MINT_SIZE,
    createInitializeMint2Instruction,
    createAssociatedTokenAccountInstruction,
    createMintToInstruction,
} from "@solana/spl-token";
import { createCreateMetadataAccountV3Instruction } from '@metaplex-foundation/mpl-token-metadata';

async function requestAirdrop(connection, publicKey) {
    const airdropSignature = await connection.requestAirdrop(publicKey, LAMPORTS_PER_SOL * 10);
    await connection.confirmTransaction(airdropSignature);
    console.log("Airdrop successful");
    const payerBalance = await connection.getBalance(publicKey);
    console.log("Payer balance after airdrop:", payerBalance / LAMPORTS_PER_SOL, "SOL");
}

(async () => {
    const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
    const payer = Keypair.generate();
    await requestAirdrop(connection, payer.publicKey);
    const payerBalance = await connection.getBalance(payer.publicKey);
    console.log("Payer balance:", payerBalance / LAMPORTS_PER_SOL, "SOL");

    const mint = Keypair.generate();
    const tokenAccount = new PublicKey('63EEC9FfGyksm7PkVC6z8uAmqozbQcTzbkWJNsgqjkFs');

    const tokenConfig = {
        decimals: 6,
        name: "My First Token",
        symbol: "MFT",
        uri: "https://raw.githubusercontent.com/DOMYTHUAN/meatada/blob/main/nft.json",
    };

    const createMintAccountInstruction = SystemProgram.createAccount({
        fromPubkey: payer.publicKey,
        newAccountPubkey: mint.publicKey,
        space: MINT_SIZE,
        lamports: await connection.getMinimumBalanceForRentExemption(MINT_SIZE),
        programId: TOKEN_PROGRAM_ID,
    });

    const initializeMintInstruction = createInitializeMint2Instruction(
        mint.publicKey,
        tokenConfig.decimals,
        payer.publicKey,
        payer.publicKey
    );

    const createMetadataInstruction = createCreateMetadataAccountV3Instruction(
        {
            metadata: PublicKey.findProgramAddressSync(
                [Buffer.from("metadata"), TOKEN_PROGRAM_ID.toBuffer(), mint.publicKey.toBuffer()],
                TOKEN_PROGRAM_ID,
            )[0],
            mint: mint.publicKey,
            mintAuthority: payer.publicKey,
            payer: payer.publicKey,
            updateAuthority: payer.publicKey,
        },
        {
            createMetadataAccountArgsV3: {
                data: {
                    creators: null,
                    name: tokenConfig.name,
                    symbol: tokenConfig.symbol,
                    uri: tokenConfig.uri,
                    sellerFeeBasisPoints: 0,
                    collection: null,
                    uses: null,
                },
                collectionDetails: null,
                isMutable: true,
            },
        }
    );

    const tokenAccountInstruction = createAssociatedTokenAccountInstruction(
        payer.publicKey,
        tokenAccount,
        payer.publicKey,
        mint.publicKey
    );

    const mintToInstruction = createMintToInstruction(
        mint.publicKey,
        tokenAccount,
        payer.publicKey,
        1_000_000,
        [],
        TOKEN_PROGRAM_ID,
    );

    const tx = new Transaction().add(
        createMintAccountInstruction,
        initializeMintInstruction,
        createMetadataInstruction,
        tokenAccountInstruction,
        mintToInstruction
    );

    try {
        const signature = await sendAndConfirmTransaction(connection, tx, [payer, mint]);
        console.log("Transaction signature:", signature);
    } catch (err) {
        console.error("Transaction failed:", err);
        if (err.logs) {
            console.error('Transaction logs:', err.logs);
        }
    }
})();
