// GitHub API configuration
const GITHUB_API_BASE = 'https://api.github.com/repos';

// Project URLs configuration
const projectUrls = [
    'S4lXLV/Twitter-X-Cleaner',
    'S4lXLV/Reddit-Copycat'
];

// Cache configuration
const CACHE_KEY_PREFIX = 'github_repo_';
const CACHE_DURATION = 2 * 60 * 60 * 1000; // 2 hours in milliseconds

// GitHub API request headers
const headers = {
    'Accept': 'application/vnd.github.v3+json'
};

// Check and load data from cache
function getFromCache(repoUrl) {
    try {
        const cacheKey = CACHE_KEY_PREFIX + repoUrl;
        const cached = localStorage.getItem(cacheKey);
        if (!cached) return null;

        const { data, timestamp } = JSON.parse(cached);
        const age = Date.now() - timestamp;

        // Return null if cache is expired
        if (age > CACHE_DURATION) {
            localStorage.removeItem(cacheKey);
            return null;
        }

        return data;
    } catch (error) {
        console.warn('Error reading from cache:', error);
        return null;
    }
}

// Save data to cache
function saveToCache(repoUrl, data) {
    try {
        const cacheKey = CACHE_KEY_PREFIX + repoUrl;
        const cacheData = {
            data,
            timestamp: Date.now()
        };
        localStorage.setItem(cacheKey, JSON.stringify(cacheData));
    } catch (error) {
        console.warn('Error saving to cache:', error);
    }
}

// Fetch repository data from GitHub
async function fetchRepoData(repoUrl) {
    // Try to get data from cache first
    const cachedData = getFromCache(repoUrl);
    if (cachedData) {
        console.log('Using cached data for', repoUrl);
        return cachedData;
    }

    try {
        // Fetch from GitHub API if no cache
        console.log('Fetching fresh data for', repoUrl);
        let response = await fetch(`${GITHUB_API_BASE}/${repoUrl}`, { headers });
        
        if (response.status === 403) {
            console.warn('Rate limited by GitHub API, using fallback method...');
            const fallbackData = await fetchRepoDataFallback(repoUrl);
            if (fallbackData) saveToCache(repoUrl, fallbackData);
            return fallbackData;
        }

        if (!response.ok) {
            throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        
        // Fetch languages
        const languagesResponse = await fetch(data.languages_url, { headers });
        const languages = await languagesResponse.json();

        // Get repository image
        const imageUrl = await getRepositoryImage(repoUrl);
        
        const repoData = {
            name: data.name,
            description: data.description || 'No description available',
            stars: data.stargazers_count,
            forks: data.forks_count,
            languages: Object.keys(languages),
            homepage: data.homepage,
            html_url: data.html_url,
            topics: data.topics || [],
            image: imageUrl,
            lastUpdated: Date.now()
        };

        // Save the fresh data to cache
        saveToCache(repoUrl, repoData);
        return repoData;
    } catch (error) {
        console.error(`Error fetching repo data for ${repoUrl}:`, error);
        const fallbackData = await fetchRepoDataFallback(repoUrl);
        if (fallbackData) saveToCache(repoUrl, fallbackData);
        return fallbackData;
    }
}

// Fallback method when API fails
async function fetchRepoDataFallback(repoUrl) {
    try {
        // Extract owner and repo from URL
        const [owner, repo] = repoUrl.split('/');
        
        // Use GitHub's public URL to get basic info
        const imageUrl = await getRepositoryImage(repoUrl);
        
        return {
            name: repo,
            description: 'Repository information temporarily unavailable',
            stars: '?',
            forks: '?',
            languages: [],
            homepage: `https://github.com/${repoUrl}`,
            html_url: `https://github.com/${repoUrl}`,
            topics: [],
            image: imageUrl
        };
    } catch (error) {
        console.error('Fallback method failed:', error);
        return null;
    }
}

// Get repository image with fallbacks
async function getRepositoryImage(repoUrl) {
    try {
        // Try multiple image sources in order
        const imageSources = [
            `https://raw.githubusercontent.com/${repoUrl}/main/social-preview.png`,
            `https://raw.githubusercontent.com/${repoUrl}/main/.github/social-preview.png`,
            `https://raw.githubusercontent.com/${repoUrl}/master/social-preview.png`,
            `https://raw.githubusercontent.com/${repoUrl}/master/.github/social-preview.png`,
            `https://opengraph.githubassets.com/1/${repoUrl}`
        ];

        for (const src of imageSources) {
            try {
                const response = await fetch(src);
                if (response.ok) {
                    return src;
                }
            } catch (e) {
                continue;
            }
        }

        // If all attempts fail, return default image
        return 'https://raw.githubusercontent.com/github/explore/master/topics/github/github.png';
    } catch (error) {
        console.warn('Error fetching repo image:', error);
        return 'https://raw.githubusercontent.com/github/explore/master/topics/github/github.png';
    }
}

// Create project card HTML
function createProjectCard(project) {
    if (!project) return '';
    
    return `
        <article class="project-card">
            <div class="project-content">
                <div class="project-image">
                    <a href="${project.html_url}" target="_blank" aria-label="View ${project.name} repository">
                        <img src="${project.image}" alt="${project.name}" loading="lazy" onerror="this.src='https://raw.githubusercontent.com/github/explore/master/topics/github/github.png'">
                    </a>
                </div>
                <h3>${project.name}</h3>
                <p>${project.description}</p>
                <div class="project-tech">
                    ${project.languages.map(lang => `<span>${lang}</span>`).join('')}
                </div>
                <div class="project-stats">
                    <span><i class="fas fa-star"></i> ${project.stars}</span>
                    <span><i class="fas fa-code-branch"></i> ${project.forks}</span>
                </div>
                <div class="project-links">
                    <a href="${project.html_url}" class="project-link" target="_blank">
                        <i class="fab fa-github"></i> Code
                    </a>
                    ${project.homepage ? `
                        <a href="${project.homepage}" class="project-link" target="_blank">
                            <i class="fas fa-external-link-alt"></i> Demo
                        </a>
                    ` : ''}
                </div>
            </div>
        </article>
    `;
}

// Load and render projects with retry
async function loadProjects(retryCount = 3) {
    const projectGrid = document.querySelector('.project-grid');
    if (!projectGrid) return;

    projectGrid.innerHTML = '<div class="loading">Loading projects...</div>';

    try {
        const projects = await Promise.all(
            projectUrls.map(url => fetchRepoData(url))
        );

        const validProjects = projects.filter(p => p !== null);

        if (validProjects.length === 0) {
            projectGrid.innerHTML = '<p>No projects found</p>';
            return;
        }

        projectGrid.innerHTML = validProjects.map(createProjectCard).join('');
    } catch (error) {
        console.error('Error loading projects:', error);
        if (retryCount > 0) {
            console.log(`Retrying... ${retryCount} attempts remaining`);
            setTimeout(() => loadProjects(retryCount - 1), 1000);
        } else {
            projectGrid.innerHTML = '<p>Error loading projects. Please try again later.</p>';
        }
    }
}

// Clear expired cache entries
function clearExpiredCache() {
    try {
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key.startsWith(CACHE_KEY_PREFIX)) {
                const cached = JSON.parse(localStorage.getItem(key));
                const age = Date.now() - cached.timestamp;
                if (age > CACHE_DURATION) {
                    localStorage.removeItem(key);
                }
            }
        }
    } catch (error) {
        console.warn('Error clearing expired cache:', error);
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    clearExpiredCache(); // Clean up expired cache entries
    loadProjects();
});

// Export functions for potential reuse
export { loadProjects };

// Function to add a new project URL
function addProject(githubUrl) {
    // Extract owner/repo format from full GitHub URL
    const match = githubUrl.match(/github\.com\/([^/]+\/[^/]+)/);
    if (!match) {
        console.error('Invalid GitHub URL format');
        return false;
    }
    
    const repoPath = match[1];
    if (!projectUrls.includes(repoPath)) {
        projectUrls.push(repoPath);
        loadProjects(); // Reload projects
        return true;
    }
    return false;
} 