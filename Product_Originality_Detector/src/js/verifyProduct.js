App = {
    web3Provider: null,
    contracts: {},

    init: async function() {
        return await App.initWeb3();
    },

    initWeb3: function() {
        if(window.ethereum) {
            App.web3Provider = window.ethereum;
            window.ethereum.request({method:'eth_requestAccounts'}).catch(function(error){
                console.error('MetaMask account access denied:', error);
            });
        } else if(window.web3) {
            App.web3Provider = window.web3.currentProvider;
        } else {
            App.web3Provider = new Web3.providers.HttpProvider('http://localhost:7545');
        }

        web3 = new Web3(App.web3Provider);
        return App.initContract();
    },

    initContract: function() {

        $.getJSON('product.json',function(data){

            var productArtifact=data;
            App.contracts.product=TruffleContract(productArtifact);
            App.contracts.product.setProvider(App.web3Provider);
        });

        return App.bindEvents();
    },

    bindEvents: function() {

        $(document).on('click','.btn-register',App.getData);
    },

    getData:function(event) {
        event.preventDefault();
        var productSN = document.getElementById('productSN').value.trim();
        var consumerCode = document.getElementById('consumerCode').value.trim();
        var logTarget = document.getElementById('logdata');
        if(!productSN || !consumerCode){
            logTarget.innerHTML = '<tr><td>Please provide both Product SN and Consumer Code.</td></tr>';
            return;
        }
        var productInstance;
        //window.ethereum.enable();
        web3.eth.getAccounts(function(error,accounts){

            if(error) {
                console.log(error);
            }

            var account=accounts[0];
            // console.log(account);
            App.contracts.product.deployed().then(function(instance){

                productInstance=instance;
                return productInstance.verifyProduct(web3.fromAscii(productSN), web3.fromAscii(consumerCode),{from:account});

            }).then(function(txReceipt){

                var isGenuine;
                if(txReceipt && Array.isArray(txReceipt.logs)) {
                    var verificationLog = txReceipt.logs.find(function(log){
                        return log.event === 'ProductVerification';
                    });
                    if(verificationLog && verificationLog.args && typeof verificationLog.args.isGenuine !== 'undefined'){
                        isGenuine = verificationLog.args.isGenuine;
                    }
                }

                if(typeof isGenuine === 'undefined') {
                    return productInstance.verifyProduct.call(web3.fromAscii(productSN), web3.fromAscii(consumerCode),{from:account}).then(function(callResult){
                        return {isGenuine: callResult, account: account};
                    });
                }

                return {isGenuine: isGenuine, account: account};

           }).then(function(result){

                var tr="<tr>";
                tr+="<td>"+ (result.isGenuine ? "Genuine Product." : "Fake Product.") +"</td>";
                tr+="</tr>";

                logTarget.innerHTML = tr;
                document.getElementById('add').innerHTML=result.account;
           }).catch(function(err){
               console.log(err.message);
           })
        })
    }
};

$(function() {
    $(window).load(function() {
        App.init();
    })
})