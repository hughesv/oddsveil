import { useMemo, useState } from 'react';
import { useAccount, useReadContract } from 'wagmi';
import { Contract, ethers } from 'ethers';
import { Header } from './Header';
import { useEthersSigner } from '../hooks/useEthersSigner';
import { useZamaInstance } from '../hooks/useZamaInstance';
import { CONTRACT_ADDRESS, CONTRACT_ABI } from '../config/contracts';
import '../styles/LotteryApp.css';

const numberOptions = Array.from({ length: 20 }, (_, index) => index + 1);
const rewardTiers = [
  { label: 'Match one number', value: '1,000' },
  { label: 'Match two numbers', value: '100,000' },
];

export function LotteryApp() {
  const { address, isConnected } = useAccount();
  const signerPromise = useEthersSigner();
  const { instance, isLoading: zamaLoading, error: zamaError } = useZamaInstance();
  const isConfigured = true;
  const [firstNumber, setFirstNumber] = useState('1');
  const [secondNumber, setSecondNumber] = useState('2');
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isBuying, setIsBuying] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [decryptedPoints, setDecryptedPoints] = useState<string | null>(null);

  const { data: ticketData, refetch: refetchTicket } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: 'getTicket',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && isConfigured,
    },
  });

  const { data: pointsData, refetch: refetchPoints } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: 'getPoints',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && isConfigured,
    },
  });

  const { data: lastDrawData, refetch: refetchLastDraw } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: 'getLastDraw',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && isConfigured,
    },
  });

  const ticketActive = useMemo(() => {
    if (!ticketData) {
      return false;
    }
    return Boolean(ticketData[2]);
  }, [ticketData]);

  const encryptedTicket = useMemo(() => {
    if (!ticketData) {
      return null;
    }
    return {
      first: ticketData[0] as string,
      second: ticketData[1] as string,
    };
  }, [ticketData]);

  const encryptedPoints = pointsData ? (pointsData as string) : null;

  const lastDraw = useMemo(() => {
    if (!lastDrawData) {
      return null;
    }
    return {
      first: lastDrawData[0] as string,
      second: lastDrawData[1] as string,
    };
  }, [lastDrawData]);

  
  const canInteract = isConnected && !!address && isConfigured;

  const resetMessages = () => {
    setStatusMessage('');
    setErrorMessage('');
  };

  const handleBuyTicket = async () => {
    resetMessages();

    if (!isConfigured) {
      setErrorMessage('Set the contract address to start playing.');
      return;
    }

    if (!canInteract) {
      setErrorMessage('Connect your wallet to buy a ticket.');
      return;
    }

    if (!instance || !signerPromise) {
      setErrorMessage('Encryption service is still loading.');
      return;
    }

    const firstValue = Number(firstNumber);
    const secondValue = Number(secondNumber);
    const invalidInput =
      !Number.isInteger(firstValue) ||
      !Number.isInteger(secondValue) ||
      firstValue < 1 ||
      firstValue > 20 ||
      secondValue < 1 ||
      secondValue > 20;

    if (invalidInput) {
      setErrorMessage('Pick two numbers between 1 and 20.');
      return;
    }

    setIsBuying(true);
    setDecryptedPoints(null);

    try {
      const encryptedInput = await instance
        .createEncryptedInput(CONTRACT_ADDRESS, address!)
        .add8(firstValue)
        .add8(secondValue)
        .encrypt();

      const signer = await signerPromise;
      if (!signer) {
        throw new Error('Signer not available.');
      }

      const lotteryContract = new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
      const tx = await lotteryContract.buyTicket(
        encryptedInput.handles[0],
        encryptedInput.handles[1],
        encryptedInput.inputProof,
        { value: ethers.parseEther('0.01') }
      );

      setStatusMessage('Ticket submitted. Waiting for confirmation...');
      await tx.wait();
      setStatusMessage('Ticket purchased. You can start the draw.');

      await refetchTicket();
    } catch (error) {
      console.error('Buy ticket failed:', error);
      setErrorMessage('Ticket purchase failed. Check your wallet and try again.');
    } finally {
      setIsBuying(false);
    }
  };

  const handleDraw = async () => {
    resetMessages();

    if (!isConfigured) {
      setErrorMessage('Set the contract address to start playing.');
      return;
    }

    if (!canInteract) {
      setErrorMessage('Connect your wallet to draw.');
      return;
    }

    if (!signerPromise) {
      setErrorMessage('Wallet signer is not available.');
      return;
    }

    setIsDrawing(true);
    setDecryptedPoints(null);

    try {
      const signer = await signerPromise;
      if (!signer) {
        throw new Error('Signer not available.');
      }

      const lotteryContract = new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
      const tx = await lotteryContract.draw();

      setStatusMessage('Drawing encrypted numbers...');
      await tx.wait();

      setStatusMessage('Draw completed. Rewards are encrypted on-chain.');
      await Promise.all([refetchTicket(), refetchPoints(), refetchLastDraw()]);
    } catch (error) {
      console.error('Draw failed:', error);
      setErrorMessage('Draw failed. Make sure you have an active ticket.');
    } finally {
      setIsDrawing(false);
    }
  };

  const handleDecryptPoints = async () => {
    resetMessages();

    if (!isConfigured) {
      setErrorMessage('Set the contract address to start playing.');
      return;
    }

    if (!canInteract || !instance || !signerPromise) {
      setErrorMessage('Connect your wallet to decrypt.');
      return;
    }

    if (!encryptedPoints) {
      setErrorMessage('No encrypted points found.');
      return;
    }

    if (encryptedPoints === ethers.ZeroHash) {
      setDecryptedPoints('0');
      return;
    }

    setIsDecrypting(true);

    try {
      const keypair = instance.generateKeypair();
      const handleContractPairs = [
        {
          handle: encryptedPoints,
          contractAddress: CONTRACT_ADDRESS,
        },
      ];
      const startTimeStamp = Math.floor(Date.now() / 1000).toString();
      const durationDays = '10';
      const contractAddresses = [CONTRACT_ADDRESS];
      const eip712 = instance.createEIP712(keypair.publicKey, contractAddresses, startTimeStamp, durationDays);

      const signer = await signerPromise;
      if (!signer) {
        throw new Error('Signer not available.');
      }

      const signature = await signer.signTypedData(
        eip712.domain,
        {
          UserDecryptRequestVerification: eip712.types.UserDecryptRequestVerification,
        },
        eip712.message
      );

      const result = await instance.userDecrypt(
        handleContractPairs,
        keypair.privateKey,
        keypair.publicKey,
        signature.replace('0x', ''),
        contractAddresses,
        address!,
        startTimeStamp,
        durationDays
      );

      const clearPoints = result[encryptedPoints] || '0';
      setDecryptedPoints(clearPoints);
    } catch (error) {
      console.error('Decryption failed:', error);
      setErrorMessage('Unable to decrypt points. Please try again.');
    } finally {
      setIsDecrypting(false);
    }
  };

  const handleResetDecrypt = () => {
    setDecryptedPoints(null);
  };

  return (
    <div className="lottery-app">
      <Header />
      <main className="lottery-main">
        <section className="lottery-hero">
          <div className="hero-text">
            <p className="hero-kicker">Encrypted Lucky Draw</p>
            <h2 className="hero-title">Pick two numbers, lock them with Zama FHE, and reveal rewards only to you.</h2>
            <p className="hero-subtitle">
              Every ticket is encrypted before it reaches the chain. Draws are sealed, points stay private, and only you
              can decrypt the results.
            </p>
          </div>
          <div className="hero-card">
            <div className="hero-stat">
              <span className="hero-stat-label">Ticket Price</span>
              <span className="hero-stat-value">0.01 ETH</span>
            </div>
            <div className="hero-stat">
              <span className="hero-stat-label">Numbers Range</span>
              <span className="hero-stat-value">1 - 20</span>
            </div>
            <div className="hero-stat">
              <span className="hero-stat-label">Encrypted Points</span>
              <span className="hero-stat-value">Always private</span>
            </div>
          </div>
        </section>

        <section className="lottery-grid">
          <div className="panel">
            <div className="panel-header">
              <h3 className="panel-title">Buy a Ticket</h3>
              <span className={`status-pill ${ticketActive ? 'status-live' : 'status-idle'}`}>
                {ticketActive ? 'Ticket active' : 'No active ticket'}
              </span>
            </div>
            <p className="panel-subtitle">Choose two numbers. They are encrypted before hitting the chain.</p>
            <div className="input-grid">
              <label className="input-block">
                <span>First number</span>
                <select value={firstNumber} onChange={(event) => setFirstNumber(event.target.value)}>
                  {numberOptions.map((option) => (
                    <option key={`first-${option}`} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
              <label className="input-block">
                <span>Second number</span>
                <select value={secondNumber} onChange={(event) => setSecondNumber(event.target.value)}>
                  {numberOptions.map((option) => (
                    <option key={`second-${option}`} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            {encryptedTicket ? (
              <div className="handle-block">
                <p className="handle-title">Encrypted ticket handles</p>
                <div className="handle-row">
                  <span>{encryptedTicket.first}</span>
                  <span>{encryptedTicket.second}</span>
                </div>
              </div>
            ) : (
              <div className="handle-empty">No encrypted ticket yet.</div>
            )}
            <button className="primary-button" onClick={handleBuyTicket} disabled={isBuying || zamaLoading || !canInteract}>
              {isBuying ? 'Encrypting & submitting...' : zamaLoading ? 'Loading encryption...' : 'Buy ticket'}
            </button>
          </div>

          <div className="panel">
            <div className="panel-header">
              <h3 className="panel-title">Draw & Rewards</h3>
              <span className="status-pill status-accent">Randomized on-chain</span>
            </div>
            <p className="panel-subtitle">
              The draw generates two encrypted numbers with Zama randomness and scores your ticket instantly.
            </p>
            <div className="reward-list">
              {rewardTiers.map((tier) => (
                <div key={tier.label} className="reward-row">
                  <span>{tier.label}</span>
                  <strong>{tier.value} pts</strong>
                </div>
              ))}
            </div>
            {lastDraw ? (
              <div className="handle-block">
                <p className="handle-title">Last encrypted draw</p>
                <div className="handle-row">
                  <span>{lastDraw.first}</span>
                  <span>{lastDraw.second}</span>
                </div>
              </div>
            ) : (
              <div className="handle-empty">No draw executed yet.</div>
            )}
            <button className="secondary-button" onClick={handleDraw} disabled={isDrawing || !ticketActive || !canInteract}>
              {isDrawing ? 'Drawing...' : ticketActive ? 'Start draw' : 'Buy a ticket first'}
            </button>
          </div>

          <div className="panel">
            <div className="panel-header">
              <h3 className="panel-title">Encrypted Points</h3>
              <span className="status-pill status-private">Private</span>
            </div>
            <p className="panel-subtitle">Your points stay encrypted on-chain until you request a user decryption.</p>
            <div className="points-block">
              <div>
                <span className="points-label">Encrypted handle</span>
                <p className="points-handle">{encryptedPoints || 'No points yet'}</p>
              </div>
              <div className="points-divider" />
              <div>
                <span className="points-label">Decrypted points</span>
                <p className="points-clear">{decryptedPoints ?? '***'}</p>
              </div>
            </div>
            <div className="button-row">
              <button className="primary-button" onClick={handleDecryptPoints} disabled={isDecrypting || !canInteract}>
                {isDecrypting ? 'Decrypting...' : 'Decrypt points'}
              </button>
              <button className="ghost-button" onClick={handleResetDecrypt} disabled={!decryptedPoints}>
                Hide
              </button>
            </div>
            {zamaError ? <p className="error-text">{zamaError}</p> : null}
          </div>
        </section>

        <section className="status-strip">
          <div>
            <span className="status-label">Wallet</span>
            <span className="status-value">
              {isConfigured ? (canInteract ? 'Connected' : 'Not connected') : 'Contract not set'}
            </span>
          </div>
          <div>
            <span className="status-label">Encryption</span>
            <span className="status-value">{zamaLoading ? 'Starting...' : 'Ready'}</span>
          </div>
          <div>
            <span className="status-label">Ticket</span>
            <span className="status-value">{ticketActive ? 'Active' : 'None'}</span>
          </div>
        </section>

        {statusMessage ? <div className="toast success">{statusMessage}</div> : null}
        {errorMessage ? <div className="toast error">{errorMessage}</div> : null}
      </main>
    </div>
  );
}
