// DOM Elements
const searchInput = document.getElementById("search-input");
const searchBtn = document.getElementById("search-btn");
const resultsContainer = document.getElementById("results");
const playBtn = document.getElementById("play-btn");
const prevBtn = document.getElementById("prev-btn");
const nextBtn = document.getElementById("next-btn");
const currentTitle = document.getElementById("current-title");
const currentArtist = document.getElementById("current-artist");
const currentThumbnail = document.getElementById("current-thumbnail");
const volumeSlider = document.getElementById("volume-slider");
const volumeIcon = document.getElementById("volume-icon");
const progressBar = document.getElementById("progress-bar");
const currentTimeDisplay = document.getElementById("current-time");
const durationDisplay = document.getElementById("duration");

// Variables
// Note: You should replace this with your own API key as YouTube might have disabled this one
const apiKey = "AIzaSyDQzi9zsbEzvqYkfq_on4D-y043XTCzZBw"; 
let playlist = [];
let currentIndex = 0;
let player;
let isPlayerReady = false;
let progressInterval;

// Load YouTube IFrame API
function loadYouTubeAPI() {
    if (typeof YT === 'undefined' || typeof YT.Player === 'undefined') {
        // If the API isn't loaded yet, wait for it
        window.onYouTubeIframeAPIReady = onYouTubeIframeAPIReady;
        console.log("Waiting for YouTube API to load...");
    } else {
        // If it's already loaded, initialize the player
        onYouTubeIframeAPIReady();
    }
}

// Initialize YouTube API
function onYouTubeIframeAPIReady() {
    console.log("YouTube API Ready");
    
    // Make sure the player container exists
    const playerContainer = document.getElementById('youtube-player');
    if (!playerContainer) {
        console.error("Player container not found!");
        return;
    }
    
    // Create the player
    player = new YT.Player('youtube-player', {
        height: '180',  // Increased size so it's visible for debugging
        width: '320',
        playerVars: {
            'playsinline': 1,
            'controls': 0,
            'disablekb': 1,
            'rel': 0,
            'showinfo': 0,
            'fs': 0,
            'modestbranding': 1
        },
        events: {
            'onReady': onPlayerReady,
            'onStateChange': onPlayerStateChange,
            'onError': onPlayerError
        }
    });
}

function onPlayerReady(event) {
    console.log("Player is ready");
    isPlayerReady = true;
    volumeSlider.value = player.getVolume();
    
    // Make the player container visible but small
    const playerElement = document.getElementById('youtube-player');
    if (playerElement) {
        playerElement.style.height = '90px';
        playerElement.style.width = '160px';
        playerElement.style.position = 'absolute';
        playerElement.style.opacity = '0.3';  // More visible for debugging
    }
    
    // Log player state to debug
    console.log("Player ready state:", player.getPlayerState());
}

function onPlayerStateChange(event) {
    console.log("Player state changed to:", event.data);
    
    // Update play/pause button based on player state
    if (event.data === YT.PlayerState.PLAYING) {
        playBtn.innerHTML = '<i class="fas fa-pause"></i>';
        startProgressUpdate();
    } else if (event.data === YT.PlayerState.PAUSED) {
        playBtn.innerHTML = '<i class="fas fa-play"></i>';
        stopProgressUpdate();
    } else if (event.data === YT.PlayerState.ENDED) {
        playBtn.innerHTML = '<i class="fas fa-play"></i>';
        stopProgressUpdate();
        playNext();
    } else if (event.data === YT.PlayerState.BUFFERING) {
        console.log("Video is buffering...");
    }
}

function onPlayerError(event) {
    console.error("Player error:", event.data);
    // Error codes reference: https://developers.google.com/youtube/iframe_api_reference#onError
    let errorMessage = "There was an error playing this video.";
    
    switch(event.data) {
        case 2:
            errorMessage = "Invalid YouTube video ID";
            break;
        case 5:
            errorMessage = "Video cannot be played in the embedded player";
            break;
        case 100:
            errorMessage = "Video not found or removed";
            break;
        case 101:
        case 150:
            errorMessage = "Video owner doesn't allow playback in embedded players";
            break;
    }
    
    alert(errorMessage + " Trying next one...");
    playNext();
}

// Event Listeners
searchBtn.addEventListener("click", performSearch);
searchInput.addEventListener("keypress", function(e) {
    if (e.key === "Enter") {
        performSearch();
    }
});

playBtn.addEventListener("click", togglePlay);
prevBtn.addEventListener("click", playPrevious);
nextBtn.addEventListener("click", playNext);
volumeSlider.addEventListener("input", adjustVolume);

// Progress bar event listeners
progressBar.addEventListener("input", seekToPosition);
progressBar.addEventListener("change", seekToPosition);

// Functions
async function performSearch() {
    const query = searchInput.value.trim();
    if (!query) return;
    
    // Show loading state
    resultsContainer.innerHTML = '<div class="loading">Searching...</div>';
    
    try {
        // Search for videos
        const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query + " music")}&type=video&maxResults=20&key=${apiKey}`;
        
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.error) {
            console.error("API Error:", data.error);
            resultsContainer.innerHTML = `<div class="error">API Error: ${data.error.message}</div>`;
            return;
        }
        
        if (!data.items || data.items.length === 0) {
            resultsContainer.innerHTML = '<div class="no-results">No results found</div>';
            return;
        }
        
        // Process the data
        playlist = data.items.map(item => {
            return {
                videoId: item.id.videoId,
                title: item.snippet.title,
                artist: item.snippet.channelTitle,
                thumbnail: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.default?.url
            };
        });
        
        displayResults(playlist);
    } catch (error) {
        console.error("Error fetching data from YouTube API:", error);
        resultsContainer.innerHTML = '<div class="error">Error fetching data. Please try again.</div>';
    }
}

function displayResults(videos) {
    resultsContainer.innerHTML = "";
    
    if (videos.length === 0) {
        resultsContainer.innerHTML = '<div class="no-results">No results found</div>';
        return;
    }
    
    videos.forEach((video, index) => {
        const videoId = video.videoId;
        const title = video.title;
        const artist = video.artist;
        const thumbnail = video.thumbnail;
        
        const songCard = document.createElement("div");
        songCard.classList.add("song-card");
        songCard.innerHTML = `
            <img src="${thumbnail}" alt="${title}" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICAgIDxyZWN0IHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiBmaWxsPSIjMzMzIiAvPgogICAgPHRleHQgeD0iNTAiIHk9IjUwIiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM5OTkiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGFsaWdubWVudC1iYXNlbGluZT0ibWlkZGxlIj5ObyBJbWFnZTwvdGV4dD4KPC9zdmc+'" loading="lazy">
            <div class="song-card-content">
                <h3>${title}</h3>
                <p>${artist}</p>
            </div>
        `;
        
        songCard.addEventListener("click", () => {
            playVideo(index);
        });
        
        resultsContainer.appendChild(songCard);
    });
}

function playVideo(index) {
    if (!isPlayerReady) {
        console.error("Player is not ready yet");
        alert("Player is not ready yet. Please try again in a moment.");
        return;
    }
    
    if (playlist.length === 0) {
        console.error("Playlist is empty");
        return;
    }
    
    currentIndex = index;
    const video = playlist[currentIndex];
    
    console.log("Playing video:", video.videoId, video.title);
    
    // Update control bar info
    currentTitle.textContent = video.title;
    currentArtist.textContent = video.artist;
    currentThumbnail.src = video.thumbnail || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICAgIDxyZWN0IHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiBmaWxsPSIjMzMzIiAvPgogICAgPHRleHQgeD0iNTAiIHk9IjUwIiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM5OTkiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGFsaWdubWVudC1iYXNlbGluZT0ibWlkZGxlIj5ObyBJbWFnZTwvdGV4dD4KPC9zdmc+';
    
    // Reset progress bar
    progressBar.value = 0;
    currentTimeDisplay.textContent = "0:00";
    durationDisplay.textContent = "0:00";
    
    // Load and play the video
    try {
        player.loadVideoById(video.videoId);
        player.playVideo();  // Explicitly call play
        playBtn.innerHTML = '<i class="fas fa-pause"></i>';
        startProgressUpdate();
    } catch (error) {
        console.error("Error playing video:", error);
        alert("Could not play this video. Trying next one...");
        playNext();
    }
}

function togglePlay() {
    if (!isPlayerReady) {
        console.error("Player is not ready yet");
        return;
    }
    
    if (playlist.length === 0) {
        alert("Please search and select a song first");
        return;
    }
    
    const state = player.getPlayerState();
    console.log("Current player state:", state);
    
    if (state === YT.PlayerState.PLAYING) {
        player.pauseVideo();
        playBtn.innerHTML = '<i class="fas fa-play"></i>';
        stopProgressUpdate();
    } else {
        player.playVideo();
        playBtn.innerHTML = '<i class="fas fa-pause"></i>';
        startProgressUpdate();
    }
}

function playNext() {
    if (!isPlayerReady || playlist.length === 0) return;
    
    currentIndex = (currentIndex + 1) % playlist.length;
    playVideo(currentIndex);
}

function playPrevious() {
    if (!isPlayerReady || playlist.length === 0) return;
    
    currentIndex = (currentIndex - 1 + playlist.length) % playlist.length;
    playVideo(currentIndex);
}

function adjustVolume() {
    if (!isPlayerReady) return;
    
    const volume = volumeSlider.value;
    player.setVolume(volume);
    
    // Update volume icon based on volume level
    if (volume === 0) {
        volumeIcon.className = "fas fa-volume-mute";
    } else if (volume < 50) {
        volumeIcon.className = "fas fa-volume-down";
    } else {
        volumeIcon.className = "fas fa-volume-up";
    }
}

// Progress bar functions
function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    seconds = Math.floor(seconds % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
}

function startProgressUpdate() {
    stopProgressUpdate(); // Clear any existing interval
    
    progressInterval = setInterval(() => {
        if (player && player.getCurrentTime && player.getDuration) {
            try {
                const currentTime = player.getCurrentTime() || 0;
                const duration = player.getDuration() || 0;
                const percentage = (currentTime / duration) * 100;
                
                progressBar.value = percentage;
                currentTimeDisplay.textContent = formatTime(currentTime);
                durationDisplay.textContent = formatTime(duration);
            } catch (error) {
                console.error("Error updating progress:", error);
            }
        }
    }, 1000);
}

function stopProgressUpdate() {
    if (progressInterval) {
        clearInterval(progressInterval);
    }
}

function seekToPosition() {
    if (!isPlayerReady || playlist.length === 0) return;
    
    const percentage = progressBar.value;
    const duration = player.getDuration();
    const seekTime = (percentage / 100) * duration;
    
    player.seekTo(seekTime, true);
}

// Initial setup
function init() {
    // Set default placeholder image
    currentThumbnail.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICAgIDxyZWN0IHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiBmaWxsPSIjMzMzIiAvPgogICAgPHRleHQgeD0iNTAiIHk9IjUwIiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM5OTkiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGFsaWdubWVudC1iYXNlbGluZT0ibWlkZGxlIj5ObyBJbWFnZTwvdGV4dD4KPC9zdmc+';
    
    // Set initial volume
    volumeSlider.value = 70;
    
    // Focus on search input
    searchInput.focus();
    
    // Load YouTube API
    loadYouTubeAPI();
    
    console.log("Initialization complete. Ready for YouTube API.");
}

// Call init function
document.addEventListener('DOMContentLoaded', init);