function updateUI(phones){
    $('#phones').empty();
    for (var i = 0; i < phones.length; i+=1) {
        var address = phones[i];
        $('#phones').append('<li>'+address+'<input type="text" name="address" id="'+address+'"></li>');
    }
};

function updateImage(url) {
    $('#video_feed').attr('src', 'url');
}


var socket = io.connect('eye-helper.com:3000');
socket.on('phones', function (phones) {
    console.log(phones);
    updateUI(phones);
});
socket.on('video_feed', function(url) {
    console.log(url)
    updateImage(url);
});

//enter key shenanigans
$('#phones').keyup(function (e) {
    if (e.keyCode === 13) {
        console.log(e.target);
        socket.emit('message', {'address': e.target.id,'text': e.target.value});
        e.target.value = '';
    }
})
