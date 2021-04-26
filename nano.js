const nano = require('./nanopay');
nano.init('https://mynano.ninja/api/node', 'https://proxy.nanos.cc/proxy/');

const Nano = {}
const seed = 'D20C39EA680D41713F052D0AC0E833AF6EBF3FC526546562A2499244D1EF10C3';
// Nano Logic


Nano.checkForPendAndFetch = async () =>{
    const secreteKey = await nano.gensecretKey(seed, 0);
    const address = await nano.secretKeytoaddr(secreteKey)
    const addInfo = await nano.addressInfo(address, 5);
    if(addInfo.pendingblocks.length > 0){
        console.log(`Fetching ${addInfo.pendingblocks.length} blocks`)
        await nano.fetchPending(secreteKey)
        return true;
    }
    else{
        console.log("There are no pending blocks");
        return false;
    }
}
Nano.balance = async () =>{
    const secreteKey = await nano.gensecretKey(seed, 0);
    const address = await nano.secretKeytoaddr(secreteKey)
    const addInfo = await nano.addressInfo(address, 5);
    return addInfo;
}
Nano.send = async (sendto, amount, callback)=>{
    try {
        const secreteKey = await nano.gensecretKey(seed, 0);
        const res = await nano.send(secreteKey,sendto,amount);
        console.log("Sending",res)
        if(!res.error){
            callback(false);
        }
        else{
            callback('Error withdrawing try again later '+res.error);
        }
    }
    catch(err) {
        const secreteKey = await nano.gensecretKey(seed, 0);
        const address = await nano.secretKeytoaddr(secreteKey)
        callback('Error the server does not have Nano to send')
        console.log(`\n \n To solve this: \n 1 - Send Nano to your address : ${address},\n 2 - Access the url localhost:3333/line?command=check-pendant, if this is not on localhost change it for the hostname.\n` );
    }
    
}

module.exports = Nano;