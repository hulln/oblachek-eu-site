const cloud = document.getElementById('cloud');
const rainContainer = document.getElementById('rainContainer');
const rainbow = document.getElementById('rainbow');
let isRaining = false;
let rainInterval;
const nowPlayingButton = document.getElementById('nowPlayingButton');
const ytPlayerContainer = document.getElementById('ytPlayerContainer');
let ytPlayerLoaded = false;
let ytPlayer = null;
let ytApiReady = false;
const ytVideoId = 'D-1vpxQGDQc';

function createRaindrop() {
    const raindrop = document.createElement('div');
    raindrop.className = 'raindrop';
    
    // Random position across the screen width
    const leftPosition = Math.random() * 100;
    raindrop.style.left = leftPosition + '%';
    
    // Random height for variety
    const height = Math.random() * 30 + 15;
    raindrop.style.height = height + 'px';
    
    // Random duration for natural effect
    const duration = Math.random() * 1 + 0.5;
    raindrop.style.animationDuration = duration + 's';
    
    rainContainer.appendChild(raindrop);
    
    // Remove raindrop after animation
    setTimeout(() => {
        if (raindrop.parentNode) {
            raindrop.parentNode.removeChild(raindrop);
        }
    }, duration * 1000);
}

function startRain() {
    if (isRaining) return;
    
    isRaining = true;
    cloud.classList.add('raining');
    
    // Create multiple raindrops
    rainInterval = setInterval(() => {
        for (let i = 0; i < 3; i++) {
            setTimeout(() => createRaindrop(), i * 50);
        }
    }, 100);
    
    // Stop raining after 3 seconds
    setTimeout(() => {
        stopRain();
    }, 3000);
}

function stopRain() {
    isRaining = false;
    cloud.classList.remove('raining');
    clearInterval(rainInterval);
    
    // Show rainbow after rain stops
    setTimeout(() => {
        rainbow.classList.add('show');
        setTimeout(() => {
            rainbow.classList.remove('show');
        }, 4000);
    }, 500);
}

cloud.addEventListener('click', startRain);

// Local time clock
function updateTime() {
    const now = new Date();
    const timeString = now.toLocaleTimeString('en-GB', { 
        hour: '2-digit', 
        minute: '2-digit',
        second: '2-digit',
        hour12: false 
    });
    document.getElementById('localTime').textContent = timeString;
}

// Last updated date
function setLastUpdated() {
    const modifiedAt = document.lastModified ? new Date(document.lastModified) : new Date();
    const date = Number.isNaN(modifiedAt.getTime()) ? new Date() : modifiedAt;
    const dateString = date.toLocaleDateString('en-GB', { 
        day: 'numeric', 
        month: 'long', 
        year: 'numeric' 
    });
    document.getElementById('lastUpdated').textContent = dateString;
}

// Initialize and update
updateTime();
setInterval(updateTime, 1000);
setLastUpdated();

if (nowPlayingButton && ytPlayerContainer) {
    const ensureYouTubeApi = () => {
        if (ytApiReady || document.getElementById('yt-iframe-api')) {
            return;
        }
        const script = document.createElement('script');
        script.id = 'yt-iframe-api';
        script.src = 'https://www.youtube.com/iframe_api';
        document.head.appendChild(script);
    };

    const createPlayer = () => {
        if (ytPlayerLoaded || !ytApiReady) return;
        ytPlayer = new YT.Player(ytPlayerContainer, {
            width: '1',
            height: '1',
            videoId: ytVideoId,
            playerVars: {
                autoplay: 1,
                loop: 1,
                playlist: ytVideoId,
                controls: 0,
                modestbranding: 1,
                rel: 0
            },
            events: {
                onReady: () => {
                    ytPlayer.playVideo();
                    nowPlayingButton.classList.add('is-playing');
                }
            }
        });
        ytPlayerLoaded = true;
    };

    const toggleNowPlaying = () => {
        ensureYouTubeApi();
        if (!ytPlayerLoaded) {
            if (ytApiReady) {
                createPlayer();
            }
            return;
        }

        const state = ytPlayer.getPlayerState();
        if (state === YT.PlayerState.PLAYING) {
            ytPlayer.pauseVideo();
            nowPlayingButton.classList.remove('is-playing');
        } else {
            ytPlayer.playVideo();
            nowPlayingButton.classList.add('is-playing');
        }
    };

    window.onYouTubeIframeAPIReady = () => {
        ytApiReady = true;
    };

    nowPlayingButton.addEventListener('click', toggleNowPlaying);

    document.addEventListener('keydown', (event) => {
        if (event.code !== 'Space') return;
        if (event.target && (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA')) {
            return;
        }
        event.preventDefault();
        toggleNowPlaying();
    });
}
