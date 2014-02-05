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
        // Most of this code is taken from the tutorial code...

        var options = {
            // Array of the fields that we want the list view to display
            // Request the popularity and share columns so that we can overwrite their contents for the key and bpm information
            fields: ['image', 'track', 'artist', 'album', 'time', 'popularity', 'share']
        };

        var playlist = models.Playlist.fromURI(playlistURI),
            list = List.forPlaylist(playlist, options);

        document.getElementById('playlist-player').appendChild(list.node);
        list.init();

        // Echonest URL strings
        var enBase = 'http://developer.echonest.com/api/v4/song/profile?';
        var enAPIkey = 'XKK8XTQSZ1YQKXKLL';

        // Convert the key as an integer (as it is returned by EchoNest) to something more readable
        function convertKey(key) {
            if (key != "!") {
                var keysAsStrings = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
                return keysAsStrings[key];
            }else{
                return key;
            }
        }

        // Wait for the list to have loaded and then replace the column headings with our own text
        setTimeout(function replaceNames() {
            $("th.sp-list-cell-popularity").replaceWith("<th class=\"sp-list-heading sp-list-cell-bpm\">BPM</th>");
            $("th.sp-list-cell-share").replaceWith("<th class=\"sp-list-heading sp-list-cell-key\">Key</th>");
        }, 1000);

        // This is where we actually get the song title and artist names, get the code and insert the info into the tables. 
        // I totally agree that this should be three different methods, but hey-ho, I was at a hackday...
        function printAlbums(number, offset) {
            var playlistLength = $('.sp-list-table-body').find(".sp-list-item").size();
            // EchoNest only allows you to request info for 4 or 5 songs at a time, so we need to do this in batches
            console.log('Printing '+number+' albums with offset = '+offset);
            var uriBatch = [];
            var track;
            var artist;
            var i = 0;
            console.log('playlist length = '+playlistLength);
            $('.sp-list-item').each(function(i, trackItem) {
                // Get uri of song
                var uri = trackItem.getAttribute("data-uri");
                if(undefined !== uri) {
                    // Change format of the Spotify URI to comply with EchoNest API
                    var formattedURI = uri.replace('spotify', 'spotify-WW');
                    if (i>=offset && i<4+offset) {
                        // Add the URI to our current batch
                        uriBatch.push(formattedURI);
                    }
                }
            });
            // Great - now we have the four Spotify URIs that we want to get the Key/BPM info for

            // Construct the URL request for EchoNest. There's definitely a better way to do this using a base URL with parameters...
            var enURL = enBase+'api_key='+enAPIkey+'&format=json&track_id='+uriBatch[0]+'&track_id='+uriBatch[1]+'&track_id='+uriBatch[2]+'&track_id='+uriBatch[3]+'&bucket=audio_summary';
            var batchBPM = [];
            var batchKey =[];

            console.log('enURL = '+enURL);
            
            $.getJSON(
                enURL, function (data) {
                    // console.log(data);
                    $.each(data, function(index, element) {
                        for (var k = 0; k<4; k++) {
                            if (undefined !== element.songs[k]) {
                                // console.log('pushing key and bpm for item '+k);
                                // Put the key and BPM info into our arrays
                                batchKey.push(element.songs[k].audio_summary.key);
                                batchBPM.push(element.songs[k].audio_summary.tempo);
                            }else{
                                // If this code runs, it introduces a bug
                                // We don't increment the place in the array that the subsequent BPMs and keys need to go into so they're no longer in sync
                                batchKey.push('!');
                                batchBPM.push('!');
                            }
                        }
                    });
                    // Now we've got our data, replace the column contents with it
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

                    // Run the whole thing again until we run out of songs
                    if (offset <= playlistLength){
                        printAlbums(4, offset+4);
                        console.log('next offset = '+offset+4);
                    }else{
                        console.log('reached end of list');
                    }
                });
        }

        // Run for the first time after having loaded the playlists
        setTimeout(function(){ printAlbums(4, 0); }, 1000);
    }
});