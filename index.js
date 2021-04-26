const express = require('express');
const path = require('path');
const crypto = require("crypto");
const fs = require('fs');
const useragent = require('express-useragent');
const nano = require('./nano');
const app = express();
const cors = require('cors')
const User = require('./database/model/user');

app.use(cors());
app.use(express.json()); 

app.get('/user',(req,res)=>{
    if(req.query.wallet){

    let wallet = req.query.wallet.replace(/[()'"`:;.!@#$%^&/* ]/g, "");
    if(wallet.length != 65){
        return res.json({error:'Invalid wallet'})
    }
    const fileDir = path.join(__dirname, `/data/users/${wallet}.json`);
    try {
        if(fs.existsSync(fileDir)) {
            return res.sendFile(fileDir)
        } else {
            return res.json({error:"No user with this wallet"})
        }
    } catch (err) {
        return res.json({error:err})
    }
    
    }
});

app.get('/',async(req,res)=>{
    let ip = req.ip;
    const source = req.headers['user-agent'];
    const ua = useragent.parse(source);
    //if(ua.isDesktop || ua.isBot || ua.isCurl || req.headers['user-agent'] != 'okhttp/3.14.9') return res.json({error:"I don't know what is wrong, why don't you tell me? Send an email to douglasna@protonmail.com"})
    
    if(req.query.wallet){
        let wallet = req.query.wallet.replace(/[()'"`:;.!@#$%^&/* ]/g, "");
        if(wallet.length != 65){
            return res.json({error:'Invalid wallet'})
        }
        let _user = {
            wallet,
            ip,
            balance:0,
            withdraw:0,
            lastClaim:0
        };
        await User.findOne({ip:ip},async (err, doc)=> {
            if(err) return res.json({error:'Error finding user on database.'})
            if (doc && doc != [] && doc != [{}] && doc != null){
                _user.withdraw = doc.withdraw;
                _user.lastClaim = doc.lastClaim;
            }
        });
        await User.findOne({wallet:wallet},async (err, doc)=> {
            if(err) return res.json({error:'Error finding user on database.'})
            if (doc && doc != [] && doc != [{}] && doc != null){
                _user = doc;
                if(!doc.ip){
                    _user.ip = ip;
                    await User.findOneAndUpdate({wallet:wallet},_user,(err,doc)=>{
                        if(err){
                            return console.log({error:err})
                        }
                        return false;
                    })
                }
            }else{
                await User.create(_user);
            }
            return res.json(_user);
        });
    }
    else{
        return res.json({error:'Wallet required!'})
    }
});
app.post('/withdraw',async (req,res)=>{
    if(req.body.wallet == "" || req.body.wallet == "undefined" || !req.body.wallet){
        return res.json({error:'Wallet is necessary.'})
    }
    let wallet = req.body.wallet.replace(/[()'"`:;.!@#$%^&/* ]/g, "");
    if(wallet.length != 65){
        return res.json({error:'Invalid wallet'})
    }
    Withdraw(wallet,res);
})

app.post('/free',(req,res)=>{
    const source = req.headers['user-agent'];
    const ua = useragent.parse(source);
    //if(ua.isDesktop || ua.isBot || ua.isCurl || req.headers['user-agent'] != 'okhttp/3.14.9') return res.json({error:"I don't know what is wrong, why don't you tell me? Send an email to douglasna@protonmail.com"})
    
    if(req.body.id == "" || req.body.id == "undefined" || !req.body.id){
        return res.json({error:'Mission Id is necessary.'})
    }
    if(req.body.wallet == "" || req.body.wallet == "undefined" || !req.body.wallet){
        return res.json({error:'Wallet is necessary.'})
    }
    let id = req.body.id.replace(/[()'"`:;.!@#$%^&/* ]/g, "");
    let wallet = req.body.wallet.replace(/[()'"`:;.!@#$%^&/* ]/g, "");
    if(id.length < 5){
        return res.json({error:'Invalid Mission Id'})
    }
    if(wallet.length != 65){
        return res.json({error:'Invalid wallet'})
    }
    Claim(wallet,res);

})

const RewardUser = (wallet,reward)=>{
    User.findOne({wallet:wallet},(err,_data)=>{
        if(err){
           return console.log({error:"User do not exist."});
        }
        else{
            const _d = _data;
            if(_data == null) return console.log({error:"Error finding user with this wallet"});
            _d.balance += reward;
            if(!_d.rewarded) _d.rewarded = 0;
            _d.rewarded += 1;
            User.findOneAndUpdate({wallet:wallet},_d,(err,doc)=>{
                if(err){
                    return console.log({error:err})
                }
                return false;
            })
        }
    })
}
const Withdraw = (wallet,res)=>{
    User.findOne({wallet},(err,_data)=>{
        if(!_data) return res.json({error:"Wallet not registered"})
        if(err){
            return res.json({error:"Error try again later"})
        }
        else{
            const _d = _data;
            if(_d.balance <= 0){
                return res.json({error:"You do not have Nano to withdraw"})
            }
            if(_d.balance >= 0.15){
                return res.json({error:"Warning, Suspect activity! \n Your withdraw will be checked by our staff, it may take a few hours."})
            }
            if(!isNaN(_d.withdraw)){
                const timeToNextWithdraw = (1000 * 60 * 60 * 24)+_d.withdraw;
                const timeDif = timeToNextWithdraw - Date.now();
                if(timeDif >= 0){
                    return res.json({error:`Your next withdraw will be availible in ${new Date(timeToNextWithdraw)}`,date:timeToNextWithdraw})
                }
                nano.send(wallet,_d.balance,(err)=>{
                    if(err){
                        return res.json({error:err})
                    }
                    _d.balance = 0;
                    _d.withdraw = Date.now();
                    User.findOneAndUpdate({wallet},_d,(err,doc)=>{
                        if(err){
                            return res.json("error: ",err)    
                        }
                        else{
                            return res.json({msg:"Successful withdraw"})
                        }
                    })
                })
            }
            else{
                return res.json({error:"Error your balance has been corrupted"})
            }
        }
    })
}
const Claim = (wallet,res)=>{
    User.findOne({wallet},(err,_data)=>{
        if(err){
            return res.json({error:"Wallet not registered"})
        }
        else{
            const _d = _data;
            if(!_d) return res.json({error:"Balance not availible"})
            if(_d.balance >= 0.25){
                return res.json({error:"Warning, Suspect activity! \n You are not able to claim free reward, our staff will check your account."})
            }
            if(!isNaN(_d.lastClaim)){
                const timeToNextClaim = (1000 * 60 * 60 * 24)+_d.lastClaim;
                const timeDif = timeToNextClaim - Date.now();
                if(timeDif >= 0){
                    return res.json({error:`Your next free Nano will be availible in ${new Date(timeToNextClaim)}`,date:timeToNextClaim})
                }
                else{
                    _d.lastClaim = Date.now()
                    if(!_d.rewarded) _d.rewarded = 0;
                    _d.rewarded += 1;
                    User.findOneAndUpdate({wallet},_d,(err,doc)=>{
                        let _result = {}
                        if(!doc || doc == {} || doc == []) return res.json({error:"User not found."})
                        if(err){
                            _result = {error:"Error! We are experiencing technical difficulties, try again later"}
                        }
                        else{
                            RewardUser(wallet,0.0001);
                            _result = {msg:"You have received 0.0001 Nano"}
                        }
                        return res.json(_result)
                    })
                }
            }
            else{
                return res.json({error:"Error your account has been corrupted, please send an Email to douglasna@protonmail.com with your wallet address and the problem will be fixed."})
            }
        }
    })
}

app.get('/line',async (req,res)=>{
    let pass = req.query.command.replace(/[()'"`:;.!@#$%^&/* ]/g, "");
    if(pass == "check-pendant"){
        const ps = await nano.checkForPendAndFetch()
        return res.json({hadPendant:ps});
    }
    if(pass == "check-balance"){
        const info = await nano.balance();
        return res.json({addressInfo:info});
    }
})
app.get('/ping',(req,res)=>{
    res.status(200).json({});
})


app.listen(process.env.PORT || 3333);

