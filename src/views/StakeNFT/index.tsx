//@ts-nocheck
import { Card, Button, Row, Col } from "react-bootstrap";

import { useState, useCallback, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { Grid, InputAdornment, OutlinedInput, Zoom } from "@material-ui/core";
import RebaseTimer from "../../components/RebaseTimer";
import { trim } from "../../helpers";
import { changeStake, changeApproval } from "../../store/slices/stake-thunk";
import "./stake.scss";
import { useWeb3Context } from "../../hooks";
import { IPendingTxn, isPendingTxn, txnButtonText } from "../../store/slices/pending-txns-slice";
import { Skeleton } from "@material-ui/lab";
import { IReduxState } from "../../store/slices/state.interface";
import { messages } from "../../constants/messages";
import classnames from "classnames";
import { warning } from "../../store/slices/messages-slice";
import Large from "../../assets/NFT/Large.gif";
import Medium from "../../assets/NFT/Medium.gif";
import Small from "../../assets/NFT/Small.gif";
import "bootstrap/dist/css/bootstrap.min.css";
import Web3 from "web3";
import { AbiItem } from "web3-utils";
import trillTokenABi from "../../assets/ABIs/abi";
import mintContractABi from "../../assets/ABIs/mintContractABi";
import stakeContractABi from "../../assets/ABIs/stakeContractABi";
import { AccountTree } from "@material-ui/icons";
//BSC
// const trillTokenAddress = "0x48980Df6f4d112C8808F23784d6FeadaFEa38803";
// const mintContractAddress = "0xBBCA7b470844447961B334d778f32BDF968e3E36";
// const stakeContractAddress = "0xcbB21413Cc12092B11932A3d1D3fA77e5a999Afb";
//Rinkeby
const trillTokenAddress = "0x311fDA80a91f7773afaC2D0b776eC2676d02185E";
const mintContractAddress = "0x985d6590603ac120c55822c700e3BB818d9F06a3";
const stakeContractAddress = "0x4146258386c094107c024A0F334ca130E298A21A";

let web3: Web3;
if (Web3.givenProvider) {
    web3 = new Web3(Web3.givenProvider);
}

function Stake() {
    const dispatch = useDispatch();
    const { provider, address, connect, chainID, checkWrongNetwork } = useWeb3Context();

    const [view, setView] = useState(0);
    const [quantity, setQuantity] = useState<string>("");
    const [balance2, setBalance2] = useState(0);
    const [reward2, setReward2] = useState(0);
    const [balance1, setBalance1] = useState(0);
    const [balance0, setBalance0] = useState(0);
    const [reward1, setReward1] = useState(0);
    const [reward0, setReward0] = useState(0);
    const [isFirst, setIsFirst] = useState(true);

    const isAppLoading = useSelector<IReduxState, boolean>(state => state.app.loading);
    const currentIndex = useSelector<IReduxState, string>(state => {
        return state.app.currentIndex;
    });
    const fiveDayRate = useSelector<IReduxState, number>(state => {
        return state.app.fiveDayRate;
    });
    const timeBalance = useSelector<IReduxState, string>(state => {
        return state.account.balances && state.account.balances.time;
    });
    const memoBalance = useSelector<IReduxState, string>(state => {
        return state.account.balances && state.account.balances.memo;
    });
    const stakeAllowance = useSelector<IReduxState, number>(state => {
        return state.account.staking && state.account.staking.time;
    });
    const unstakeAllowance = useSelector<IReduxState, number>(state => {
        return state.account.staking && state.account.staking.memo;
    });
    const stakingRebase = useSelector<IReduxState, number>(state => {
        return state.app.stakingRebase;
    });
    const stakingAPY = useSelector<IReduxState, number>(state => {
        return state.app.stakingAPY;
    });
    const stakingTVL = useSelector<IReduxState, number>(state => {
        return state.app.stakingTVL;
    });

    const pendingTransactions = useSelector<IReduxState, IPendingTxn[]>(state => {
        return state.pendingTransactions;
    });
    const setMax = () => {
        if (view === 0) {
            setQuantity(timeBalance);
        } else {
            setQuantity(memoBalance);
        }
    };

    const onSeekApproval = async (token: string) => {
        if (await checkWrongNetwork()) return;

        await dispatch(changeApproval({ address, token, provider, networkID: chainID }));
    };

    const onChangeStake = async (action: string) => {
        if (await checkWrongNetwork()) return;
        if (quantity === "" || parseFloat(quantity) === 0) {
            dispatch(warning({ text: action === "stake" ? messages.before_stake : messages.before_unstake }));
        } else {
            await dispatch(changeStake({ address, action, value: String(quantity), provider, networkID: chainID }));
            setQuantity("");
        }
    };

    const hasAllowance = useCallback(
        token => {
            if (token === "time") return stakeAllowance > 0;
            if (token === "memo") return unstakeAllowance > 0;
            return 0;
        },
        [stakeAllowance],
    );

    const changeView = (newView: number) => () => {
        setView(newView);
        setQuantity("");
    };

    const trimmedMemoBalance = trim(Number(memoBalance), 6);
    const trimmedStakingAPY = trim(stakingAPY * 100, 1);
    const stakingRebasePercentage = trim(stakingRebase * 100, 4);
    const nextRewardValue = trim((Number(stakingRebasePercentage) / 100) * Number(trimmedMemoBalance), 6);

    let trillToken = new web3.eth.Contract(trillTokenABi as AbiItem[], trillTokenAddress);
    let mintContract = new web3.eth.Contract(mintContractABi as AbiItem, mintContractAddress);
    let stakeContract = new web3.eth.Contract(stakeContractABi as AbiItem, stakeContractAddress);
    useEffect(async () => {
        let accounts = await web3.eth.requestAccounts();
        if (isFirst) {
            await approve_token("TRILLEST", mintContract, stakeContractAddress, true);
            console.log(isFirst);
            setIsFirst(false);
        }
        try {
            setBalance2(await runSmartContract2(mintContract, "balanceOf", [accounts[0], 2]));
            setReward2(await runSmartContract2(stakeContract, "getEstimatedReward", [accounts[0], 2]));
        } catch (err) {
            console.log(err);
        }
        try {
            setBalance1(await runSmartContract2(mintContract, "balanceOf", [accounts[0], 1]));
            setReward1(await runSmartContract2(stakeContract, "getEstimatedReward", [accounts[0], 1]));
        } catch (error) {
            console.log(error);
        }
        try {
            setBalance0(await runSmartContract2(mintContract, "balanceOf", [accounts[0], 0]));
            setReward0(await runSmartContract2(stakeContract, "getEstimatedReward", [accounts[0], 0]));
        } catch (error) {
            console.log(error);
        }
    }, []);
    const stakeHandler0 = async () => {
        let accounts = await web3.eth.requestAccounts();
        await runSmartContract(stakeContract, "stake", [0]);
        setBalance0(await runSmartContract2(mintContract, "balanceOf", [accounts[0], 0]));
        setReward0(await runSmartContract2(stakeContract, "getEstimatedReward", [accounts[0], 0]));
    };
    const unStakeHolder0 = async () => {
        let accounts = await web3.eth.requestAccounts();
        await runSmartContract(stakeContract, "unstake", [0]);
        setBalance0(await runSmartContract2(mintContract, "balanceOf", [accounts[0], 0]));
        setReward0(await runSmartContract2(stakeContract, "getEstimatedReward", [accounts[0], 0]));
    };
    const claimHandler0 = async () => {
        await runSmartContract(stakeContract, "claim", [0]);
    };

    const stakeHandler1 = async () => {
        let accounts = await web3.eth.requestAccounts();
        await runSmartContract(stakeContract, "stake", [1]);
        setBalance1(await runSmartContract2(mintContract, "balanceOf", [accounts[0], 1]));
        setReward1(await runSmartContract2(stakeContract, "getEstimatedReward", [accounts[0], 1]));
    };
    const unStakeHolder1 = async () => {
        let accounts = await web3.eth.requestAccounts();
        await runSmartContract(stakeContract, "unstake", [1]);
        setBalance1(await runSmartContract2(mintContract, "balanceOf", [accounts[0], 1]));
        setReward1(await runSmartContract2(stakeContract, "getEstimatedReward", [accounts[0], 1]));
    };
    const claimHandler1 = async () => {
        let accounts = await web3.eth.requestAccounts();
        await runSmartContract(stakeContract, "claim", [1]);
    };

    const stakeHandler2 = async () => {
        let accounts = await web3.eth.requestAccounts();
        await runSmartContract(stakeContract, "stake", [2]);
        setBalance2(await runSmartContract2(mintContract, "balanceOf", [accounts[0], 2]));
        setReward2(await runSmartContract2(stakeContract, "getEstimatedReward", [accounts[0], 2]));
    };
    const unStakeHolder2 = async () => {
        let accounts = await web3.eth.requestAccounts();
        await runSmartContract(stakeContract, "unstake", [2]);
        setBalance2(await runSmartContract2(mintContract, "balanceOf", [accounts[0], 2]));
        setReward2(await runSmartContract2(stakeContract, "getEstimatedReward", [accounts[0], 2]));
    };
    const claimHandler2 = async () => {
        let accounts = await web3.eth.requestAccounts();
        await runSmartContract(stakeContract, "claim", [2]);
    };

    const runSmartContract = async (contract: any, func: any, args = [], options) => {
        let accounts = await web3.eth.requestAccounts();
        if (accounts.length == 0) {
            alert("accounts.length = 0");
            return false;
        }

        if (!contract) return false;
        if (!contract.methods[func]) return false;
        const promiEvent = await contract.methods[func](...args).send(Object.assign({ from: accounts[0] }, options)); //this doesn't work now.
        return promiEvent;
    };
    const runSmartContract2 = async (contract: any, func: any, args = [], options) => {
        let accounts = await web3.eth.requestAccounts();
        if (accounts.length == 0) {
            alert("accounts.length = 0");
            return false;
        }

        if (!contract) return false;
        if (!contract.methods[func]) return false;
        const promiEvent = await contract.methods[func](...args).call({ from: accounts[0] });
        return promiEvent;
    };
    const approve_token = async (token_name: any, contract: any, spender: any, amount: any) => {
        let accounts = await web3.eth.requestAccounts();
        console.log("accounts.length", accounts.length);

        try {
            await runSmartContract(contract, "setApprovalForAll", [spender, amount]);
            console.log("asdf");
        } catch (e) {
            console.log(e);
            return false;
        }
        return true;
    };
    return (
        <div className="stake-view">
            <Zoom in={true}>
                <div className="stake-card">
                    <Col>
                        <div className="stake-card-header">
                            <p className="stake-card-header-title">NFT staking (🎩, 🎩)</p>
                        </div>
                    </Col>
                    <Row className="stake-card-grid" spacing={2}>
                        <Col xs={12} sm={4} md={4} lg={4}>
                            <div className="stake-card-metrics">
                                <Card style={{ width: "18rem" }}>
                                    <Card.Img variant="top" src={Large} />
                                    <Card.Body>
                                        <Card.Title>Epic</Card.Title>
                                        <Card.Text>The most high paying node available. </Card.Text>
                                        <div style={{ alignItems: "center" }}>
                                            Balance:
                                            <span>{balance2}</span>
                                        </div>
                                        <div style={{ alignItems: "center" }}>
                                            Expected Reward:
                                            <span>{reward2}</span>
                                        </div>
                                        <br />
                                        <Row md={12} sm={12} lg={12}>
                                            <Col md={4} sm={4} lg={4}>
                                                <Button variant="primary" onClick={stakeHandler2}>
                                                    Stake
                                                </Button>
                                            </Col>
                                            <Col md={4} sm={4} lg={4}>
                                                <Button variant="primary" onClick={unStakeHolder2}>
                                                    Unstake
                                                </Button>
                                            </Col>
                                            <Col md={4} sm={4} lg={4}>
                                                <Button variant="primary" onClick={claimHandler2}>
                                                    Claim
                                                </Button>
                                            </Col>
                                        </Row>
                                    </Card.Body>
                                </Card>
                            </div>
                        </Col>
                        <Col item xs={12} sm={4} md={4} lg={4}>
                            <div className="stake-card-metrics">
                                <Card style={{ width: "18rem" }}>
                                    <Card.Img variant="top" src={Medium} />
                                    <Card.Body>
                                        <Card.Title>Rare</Card.Title>
                                        <Card.Text>A good balance between cost and rewards</Card.Text>
                                        <div style={{ alignItems: "center" }}>
                                            Balance:
                                            <span>{balance1}</span>
                                        </div>
                                        <div style={{ alignItems: "center" }}>
                                            Expected Reward:
                                            <span>{reward1}</span>
                                        </div>
                                        <br />
                                        <Row>
                                            <Col md={6}>
                                                <Button style={{ float: "left" }} variant="primary" onClick={stakeHandler1}>
                                                    Stake
                                                </Button>
                                            </Col>
                                            <Col md={6}>
                                                <Button style={{ float: "right" }} variant="primary" onClick={unStakeHolder1}>
                                                    Unstake
                                                </Button>
                                            </Col>
                                        </Row>
                                        <br />
                                        <Row>
                                            <Col md={6}>
                                                <Button style={{ float: "left" }} variant="primary" onClick={claimHandler1}>
                                                    Claim
                                                </Button>
                                            </Col>
                                        </Row>
                                    </Card.Body>
                                </Card>
                            </div>
                        </Col>
                        <Col item xs={12} sm={4} md={4} lg={4}>
                            <div className="stake-card-metrics">
                                <Card style={{ width: "18rem" }}>
                                    <Card.Img variant="top" src={Small} />
                                    <Card.Body>
                                        <Card.Title>Common</Card.Title>
                                        <Card.Text>The cheapest node available</Card.Text>
                                        <div style={{ alignItems: "center" }}>
                                            Balance:
                                            <span>{balance0}</span>
                                        </div>
                                        <div style={{ alignItems: "center" }}>
                                            Expected Reward:
                                            <span>{reward0}</span>
                                        </div>
                                        <br />
                                        <Row>
                                            <Col md={6}>
                                                <Button style={{ float: "left" }} variant="primary" onClick={stakeHandler0}>
                                                    Stake
                                                </Button>
                                            </Col>
                                            <Col md={6}>
                                                <Button style={{ float: "right" }} variant="primary" onClick={unStakeHolder0}>
                                                    Unstake
                                                </Button>
                                            </Col>
                                        </Row>
                                        <br />
                                        <Row>
                                            <Col md={6}>
                                                <Button style={{ float: "left" }} variant="primary" onClick={claimHandler0}>
                                                    Claim
                                                </Button>
                                            </Col>
                                        </Row>
                                    </Card.Body>
                                </Card>
                            </div>
                        </Col>
                    </Row>

                    <div className="stake-card-area">
                        {!address && (
                            <div className="stake-card-wallet-notification">
                                <div className="stake-card-wallet-connect-btn" onClick={connect}>
                                    <p>Connect Wallet</p>
                                </div>
                                <p className="stake-card-wallet-desc-text">Connect your wallet to stake your NFTs!</p>
                            </div>
                        )}
                        {address && (
                            <div>
                                <div className="stake-card-action-area">
                                    <div className="stake-card-action-stage-btns-wrap">
                                        <div onClick={changeView(0)} className={classnames("stake-card-action-stage-btn", { active: !view })}>
                                            <p>Stake</p>
                                        </div>
                                        <div onClick={changeView(1)} className={classnames("stake-card-action-stage-btn", { active: view })}>
                                            <p>Unstake</p>
                                        </div>
                                    </div>

                                    <div className="stake-card-action-row">
                                        <OutlinedInput
                                            type="number"
                                            placeholder="Amount"
                                            className="stake-card-action-input"
                                            value={quantity}
                                            onChange={e => setQuantity(e.target.value)}
                                            labelWidth={0}
                                            endAdornment={
                                                <InputAdornment position="end">
                                                    <div onClick={setMax} className="stake-card-action-input-btn">
                                                        <p>Max</p>
                                                    </div>
                                                </InputAdornment>
                                            }
                                        />

                                        {view === 0 && (
                                            <div className="stake-card-tab-panel">
                                                {address && hasAllowance("time") ? (
                                                    <div
                                                        className="stake-card-tab-panel-btn"
                                                        onClick={() => {
                                                            if (isPendingTxn(pendingTransactions, "staking")) return;
                                                            onChangeStake("stake");
                                                        }}
                                                    >
                                                        <p>{txnButtonText(pendingTransactions, "staking", "Stake TIME")}</p>
                                                    </div>
                                                ) : (
                                                    <div
                                                        className="stake-card-tab-panel-btn"
                                                        onClick={() => {
                                                            if (isPendingTxn(pendingTransactions, "approve_staking")) return;
                                                            onSeekApproval("time");
                                                        }}
                                                    >
                                                        <p>{txnButtonText(pendingTransactions, "approve_staking", "Approve")}</p>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {view === 1 && (
                                            <div className="stake-card-tab-panel">
                                                {address && hasAllowance("memo") ? (
                                                    <div
                                                        className="stake-card-tab-panel-btn"
                                                        onClick={() => {
                                                            if (isPendingTxn(pendingTransactions, "unstaking")) return;
                                                            onChangeStake("unstake");
                                                        }}
                                                    >
                                                        <p>{txnButtonText(pendingTransactions, "unstaking", "Unstake TIME")}</p>
                                                    </div>
                                                ) : (
                                                    <div
                                                        className="stake-card-tab-panel-btn"
                                                        onClick={() => {
                                                            if (isPendingTxn(pendingTransactions, "approve_unstaking")) return;
                                                            onSeekApproval("memo");
                                                        }}
                                                    >
                                                        <p>{txnButtonText(pendingTransactions, "approve_unstaking", "Approve")}</p>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    <div className="stake-card-action-help-text">
                                        {address && ((!hasAllowance("time") && view === 0) || (!hasAllowance("memo") && view === 1)) && <p>asdasdf</p>}
                                    </div>
                                </div>

                                <div className="stake-user-data">
                                    <div className="data-row">
                                        <p className="data-row-name">Your Balance</p>
                                        <p className="data-row-value">{isAppLoading ? <Skeleton width="80px" /> : <>{trim(Number(timeBalance), 4)} TIME</>}</p>
                                    </div>

                                    <div className="data-row">
                                        <p className="data-row-name">Your Staked Balance</p>
                                        <p className="data-row-value">{isAppLoading ? <Skeleton width="80px" /> : <>{trimmedMemoBalance} MEMO</>}</p>
                                    </div>

                                    <div className="data-row">
                                        <p className="data-row-name">Next Reward Amount</p>
                                        <p className="data-row-value">{isAppLoading ? <Skeleton width="80px" /> : <>{nextRewardValue} MEMO</>}</p>
                                    </div>

                                    <div className="data-row">
                                        <p className="data-row-name">Next Reward Yield</p>
                                        <p className="data-row-value">{isAppLoading ? <Skeleton width="80px" /> : <>{stakingRebasePercentage}%</>}</p>
                                    </div>

                                    <div className="data-row">
                                        <p className="data-row-name">ROI (5-Day Rate)</p>
                                        <p className="data-row-value">{isAppLoading ? <Skeleton width="80px" /> : <>{trim(Number(fiveDayRate) * 100, 4)}%</>}</p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </Zoom>
        </div>
    );
}

export default Stake;
