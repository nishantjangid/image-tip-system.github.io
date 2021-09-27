// GLOBAL VARIABLES
let provider = "";
let web3 = "";
let contract = "";
let connectedAccount = "";

let ethContractDetails = {
    abi : [{"constant":true,"inputs":[],"name":"name","outputs":[{"name":"","type":"string"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"name":"","type":"uint256"}],"name":"images","outputs":[{"name":"id","type":"uint256"},{"name":"hash","type":"string"},{"name":"description","type":"string"},{"name":"tipAmount","type":"uint256"},{"name":"author","type":"address"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"imageCount","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"_imgHash","type":"string"},{"name":"_description","type":"string"}],"name":"uploadImage","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"name":"_id","type":"uint256"}],"name":"tipImageOwnwer","outputs":[],"payable":true,"stateMutability":"payable","type":"function"},{"anonymous":false,"inputs":[{"indexed":false,"name":"id","type":"uint256"},{"indexed":false,"name":"hash","type":"string"},{"indexed":false,"name":"description","type":"string"},{"indexed":false,"name":"tipAmount","type":"uint256"},{"indexed":false,"name":"author","type":"address"}],"name":"ImageCreated","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"name":"id","type":"uint256"},{"indexed":false,"name":"hash","type":"string"},{"indexed":false,"name":"description","type":"string"},{"indexed":false,"name":"tipAmount","type":"uint256"},{"indexed":false,"name":"author","type":"address"}],"name":"ImageTipped","type":"event"}],
    ownerAddress : "0x2cdA25C0657d7622E6301bd93B7EC870a56fE500",
    contractAddress : "0xd7FF16171B011A7205816c53af35CC5Ad333924f",
}

// CONNECT WALLET
const connectMetamask = async () => {
    try{
        if(window.ethereum){
            wallet = "Metamask";
            window.ethereum.enable();
            provider = await window.web3.currentProvider;        
            web3 = new Web3(provider);
            let chainId = await web3.eth.net.getId();
            let accounts = await web3.eth.getAccounts();
            connectedAccount = accounts[0];
            contract = new web3.eth.Contract(ethContractDetails.abi, ethContractDetails.contractAddress);
            showImageList();
            // show connected address
            $("#metaMaskAccount").text(connectedAccount);

        }
    }catch(err){
        alert("Not a ethereum browser");
    }
}
connectMetamask();

$("#submit").on('click', (e)=>{
    e.preventDefault();
    const file = document.getElementById("file");    
    const reader = new FileReader();
    const desc = $("[name=description]").val();
    const image = $("[name=image]").val();
    $("#loaderDiv").css('display','block');

    if(desc != (null || undefined || "") && image != (null || undefined || "")){
        reader.onloadend = function(e){
            let ipfs = new IpfsApi({host:`ipfs.infura.io`,port:5001,protocol:`https`})
            let {Buffer} = ipfs;
              
            const buf = Buffer(reader.result) // Convert data into buffer
            if(web3 != (null || undefined || "")){
                ipfs.add(buf, async (err, result) => { // Upload buffer to IPFS
                  if (err) {
                    console.error(err)
                    return
                  }
                  const hash = await result[0].hash;                            
                  contract.methods.uploadImage(hash, desc).send({from : connectedAccount}).on('transactionHash', (hash)=>{
                      console.log(`https://ipfs.io/ipfs/${result[0].hash}`);
                    })
                    .on('confirmation', function(confirmationNumber, receipt){
                      $("#loaderDiv").css('display','none');                    
                    })
                    .on('error', function(error, receipt) {
                        alert("Somthing went wrong");
                    });
                })        
            }else{
                alert("Please connect metamask");
            }        
        }
        reader.readAsArrayBuffer(file.files[0]);
    }else{
        alert("Please fill required fields");
        return false;
    }
})

const showImageList = async () => {
    const imageCount = await contract.methods.imageCount().call();
    var html = "";    
    $("#imageList").empty();
    for(i=1; i<=imageCount;i++){
        const image = await contract.methods.images(i).call();
        // console.log(image);
        html += `
        <div class="image-card">
            <div class="image-card-header">
                <h2><b>Owner Address</b> : ${image.author}</h2>
            </div>
            <div class="image-card-body">
                <img src="https://ipfs.io/ipfs/${image.hash}" />
                <p>${image.description}</p>
            </div>
            <div class="image-card-footer">
                <span class="tipAmount"><b>Tip :</b>${web3.utils.fromWei(image.tipAmount.toString(),'Ether')}</span>
                <div>
                    <span><input type="text" value="" class="tipAmount${image.id}" /></span>
                    <span><button type="button" class="btn" onclick="sendTipAmount(${image.id})">Send Tip</button></span>
                </div>
            </div>
        </div>        
        `;
    }
    $("#imageList").append(html);
}


const sendTipAmount = (id) => {
    const tipAmount = $(`.tipAmount${id}`).val();

    if(parseFloat(tipAmount) > 0){
        const amount = web3.utils.toWei(tipAmount, 'Ether');
        $("#loaderDiv").css('display','block');
        contract.methods.tipImageOwnwer(id).send({from : connectedAccount, value: amount}).on('transactionHash', (hash)=>{
            console.log(hash);
        })
        .on('confirmation', function(confirmationNumber, receipt){
            $("#loaderDiv").css('display','none');                    
        })
        .on('error', function(error, receipt) {
            alert("Somthing went wrong");
        });
    }else{
        alert("Tip amount is must be greater then 0");
    }
}
