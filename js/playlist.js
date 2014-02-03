require([
    '$api/models',
    '$views/list#List'
], function(models, List) {

    var playlistURI;

    // Handle drops
    var dropBox = document.querySelector('#drop-box');

    dropBox.addEventListener('dragstart', function(e){
        e.dataTransfer.setData('text/html', this.innerHTML);
        e.dataTransfer.effectAllowed = 'copy';
    }, false);

    dropBox.addEventListener('dragenter', function(e){
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
        this.classList.add('over');
    }, false);

    dropBox.addEventListener('dragover', function(e){
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
        return false;
    }, false);

    dropBox.addEventListener('dragleave', function(e){
        e.preventDefault();
        this.classList.remove('over');
    }, false);

    dropBox.addEventListener('drop', function(e){
        e.preventDefault();
        var drop = models.Playlist.fromURI(e.dataTransfer.getData('text'));
        this.classList.remove('over');
        var successMessage = document.createElement('p');
        successMessage.innerHTML = 'Playlist successfully dropped: ' + drop.uri;
        // "http://open.spotify.com/user/ylevtov/playlist/4voZh03pjqzzhKTapTZwjR"
        var formattedPlaylistURI1 = drop.uri.replace('http://open.spotify.com/', 'spotify:');
        playlistURI = formattedPlaylistURI1.replace(/\//g, ':');
        buildPlaylist();
        console.log('playlistURI ='+playlistURI);

        this.appendChild(successMessage);
    }, false);

    function buildPlaylist() {
        var options = {
            fields: ['image', 'track', 'artist', 'album', 'time', 'popularity', 'share']
        };
        // var playlist = models.Playlist.fromURI('spotify:user:ylevtov:playlist:3FbviyrbaDLj7AlKGJYGN8'),
        //     list = List.forPlaylist(playlist, options);

        var playlist = models.Playlist.fromURI(playlistURI),
            list = List.forPlaylist(playlist, options);

        document.getElementById('playlist-player').appendChild(list.node);
        list.init();

        // Echonest URL strings
        var enBase = 'http://developer.echonest.com/api/v4/song/profile?';
        var enAPIkey = 'XKK8XTQSZ1YQKXKLL';

        function convertKey(key) {
            if (key != "!") {
                var keysAsStrings = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
                return keysAsStrings[key];
            }else{
                return key;
            }
        }

        setTimeout(function replaceNames() {
            $("th.sp-list-cell-popularity").replaceWith("<th class=\"sp-list-heading sp-list-cell-bpm\">BPM</th>");
            $("th.sp-list-cell-share").replaceWith("<th class=\"sp-list-heading sp-list-cell-key\">Key</th>");
        }, 1000);


        function printAlbums(number, offset) {
            var playlistLength = $('.sp-list-table-body').find(".sp-list-item").size();
            console.log('Printing '+number+' albums with offset = '+offset);
            var uriBatch = [];
            var track;
            var artist;
            var i = 0;
            console.log('playlist length = '+playlistLength);
            $('.sp-list-item').each(function(i, trackItem) {
                // console.log($(this));
                var uri = trackItem.getAttribute("data-uri");
                if(undefined !== uri) {
                    var formattedURI = uri.replace('spotify', 'spotify-WW');
                    // console.log('formattedURI = '+formattedURI);
                    if (i>=offset && i<4+offset) {
                        // console.log('URI for '+ i +' = '+formattedURI);
                        uriBatch.push(formattedURI);
                        var popularity = $('.sp-list-cell-popularity', trackItem);
                    }
                }
            });
            for (var u = 0; u<uriBatch.length; u++) {
                console.log('URIBatch at index '+u+" = "+uriBatch[u]);
            }

            var enURL = enBase+'api_key='+enAPIkey+'&format=json&track_id='+uriBatch[0]+'&track_id='+uriBatch[1]+'&track_id='+uriBatch[2]+'&track_id='+uriBatch[3]+'&bucket=audio_summary';
            var batchBPM = [];
            var batchKey =[];

            console.log('enURL = '+enURL);
            
            $.getJSON(
                enURL, function (data) {
                    console.log(data);
                    $.each(data, function(index, element) {
                        for (var k = 0; k<4; k++) {
                            if (undefined !== element.songs[k]) {
                                // console.log('pushing key and bpm for item '+k);
                                batchKey.push(element.songs[k].audio_summary.key);
                                batchBPM.push(element.songs[k].audio_summary.tempo);
                            }else{
                                batchKey.push('!');
                                batchBPM.push('!');
                            }
                        }
                    });
                    $('.sp-list-item').each(function(i, trackItem) {
                        if (i>=offset && i<4+offset) {
                            // console.log('replace '+i);
                            $(this).find(".sp-list-cell-popularity").each(function (l) {
                                // console.log($(this));
                                $(this).html(batchBPM[i-offset]);
                            });
                            $(this).find(".sp-list-cell-share").each(function (l) {
                                // console.log($(this));
                                $(this).html(convertKey(batchKey[i-offset]));
                            });
                        }
                    });
                    console.log('done');
                    console.log('next number = '+(playlistLength-(number+offset)));
                    if (offset <= playlistLength){
                        printAlbums(4, offset+4);
                        console.log('next offset = '+offset+4);
                    }else{
                        console.log('reached end of list');
                    }
                });
        }

        setTimeout(function(){ printAlbums(4, 0); }, 1000);
    }
});

// playlistURI = "spotify:user:ylevtov:playlist:3FbviyrbaDLj7AlKGJYGN8";
// setTimeout(buildPlaylist, 1000);
// console.log('blahg');