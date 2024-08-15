import {
    Connection,
    Keypair,
    SystemProgram,
    PublicKey,
    Transaction,
    sendAndConfirmTransaction,
} from "@solana/web3.js";
import {
    TOKEN_PROGRAM_ID,
    MINT_SIZE,
    createInitializeMint2Instruction,
} from "@solana/spl-token";
import { createCreateMetadataAccountV3Instruction } from "@metaplex-foundation/mpl-token-metadata";

(async () => {
    const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
    const payer = Keypair.generate();

    const mint = Keypair.generate();

    const nftConfig = {
        name: "My NFT",
        symbol: "MNFT",
        uri: "https://github.com/DOMYTHUAN/meatada/blob/main/nft.json",
        royalty: 10,
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
        0,
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
                    name: nftConfig.name,
                    symbol: nftConfig.symbol,
                    uri: nftConfig.uri,
                    sellerFeeBasisPoints: nftConfig.royalty * 100,
                    collection: null,
                    uses: null,
                },
                collectionDetails: null,
                isMutable: true,
            },
        }
    );

    const tx = new Transaction().add(
        createMintAccountInstruction,
        initializeMintInstruction,
        createMetadataInstruction
    );

    try {
        const signature = await sendAndConfirmTransaction(connection, tx, [payer, mint]);
        console.log("Transaction signature:", signature);
    } catch (err) {
        console.error("Transaction failed:", err);
    }
})();
