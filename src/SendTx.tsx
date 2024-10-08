import {
    SendTransactionRequest,
    useIsConnectionRestored,
    useTonConnectModal,
    useTonConnectUI,
    useTonWallet
} from "@tonconnect/ui-react";
import {Address, beginCell, Cell, toNano} from "@ton/core";
import {getJettonWalletAddress, waitForTx} from "./tonapi.ts";
import {useState} from "react";
import {USDT} from "./constants.ts";
import './App.css';
import { MainButton } from "./MainButton.tsx";

interface SendTxProps {
  selectedAmount: number | null;
}

export const SendTx = ({ selectedAmount }: SendTxProps) => {
    const wallet = useTonWallet();
    const isRestored = useIsConnectionRestored();
    const { open } = useTonConnectModal();
    const [tonConnectUi] = useTonConnectUI();
    const [txInProgress, setTxInProgress] = useState<'none' | 'jetton'>('none');
    
    const onSendJettonLottery = async () => {
        if (selectedAmount === null || !wallet) {
            console.error('No amount selected or wallet is not connected');
            return;
        }

        if (!wallet) {
            open();
            return;
        }
       
        setTxInProgress('jetton');
    
        try {
            const jwAddress = await getJettonWalletAddress(USDT.toRawString(), wallet!.account.address);
            const smcAddress = Address.parse("kQCi-fmiAuPsRnumDWScBcJ_zSO5QeG_Q5hLK43En8yojmci");
            const decimals = 9;

            const innerPayload = beginCell()
                .storeUint(0xfbf0ec9b, 32) 
                .endCell();
    
            const jwPayload = beginCell()
                .storeUint(0xf8a7ea5, 32)
                .storeUint(0, 64)
                .storeCoins(selectedAmount * 10**decimals)
                .storeAddress(smcAddress)
                .storeUint(0, 2) // response address -- null
                .storeUint(0, 1)
                .storeCoins(toNano("0.0555"))
                .storeBit(1)
                .storeRef(innerPayload)
                .endCell()
    
            const payload = jwPayload.toBoc().toString('base64');
    
            const tx: SendTransactionRequest = {
                validUntil: Math.round(Date.now() / 1000) + 60 * 5,
                messages: [
                    {
                        address: jwAddress.toString(),
                        amount: "87200000", 
                        payload
                    }
                ]
            };
            
            const result = await tonConnectUi.sendTransaction(tx, {
                modals: 'all',
                notifications: ['success', 'error']
            });
    
            if (!result || !result.boc) {
                console.error('No result received from transaction request');
                return;
            }
            const imMsgCell = Cell.fromBase64(result.boc);
            const inMsgHash = imMsgCell.hash().toString('hex');
    
            try {
                const tx = await waitForTx(inMsgHash);
                console.log(tx);
            } catch (e) {
                console.error('Error waiting for transaction:', e);
            }
        } catch (e) {
            console.error('Error sending transaction:', e);
        } finally {
            setTxInProgress('none');
        }
    };

    if (!isRestored) {
        // return 'Loading...';
    }

    if (!wallet) {
        // return <button onClick={open}>Connect wallet</button>
    }
    
    return (
        
        <div>
            <MainButton
                text="Send $INFT"
                onClick={onSendJettonLottery}
                color="#4b2352"
                textColor="#FFFFFF"
                disabled={!wallet || selectedAmount === null || txInProgress !== 'none'}

            />
            
        </div>
    );
};