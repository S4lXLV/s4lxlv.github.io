// GitHub API configuration
const GITHUB_API_BASE = 'https://api.github.com/repos';

// Cache configuration
const CACHE_KEY_PREFIX = 'github_repo_';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours (increased from 2 hours)

// GitHub API request headers
const headers = {
    'Accept': 'application/vnd.github.v3+json'
};

// Request timeout configuration
const FETCH_TIMEOUT = 5000; // 5 seconds max per request

// ============================================
// SIMPLE PROJECT CONFIGURATION
// ============================================
// Just add your projects here with their links!
// The system will automatically:
// - Fetch GitHub data if github link is provided
// - Use custom data if no github link
// - Add Chrome Store, Product Hunt, and custom image links
// ============================================

const PROJECTS = [
    {
        name: "Daily Byte English",
        github: null, // No GitHub repo (closed source)
        chromeStore: "https://chromewebstore.google.com/detail/daily-byte-english/acekepmbnnnklfbeagmkncipjdeomieo",
        productHunt: "https://www.producthunt.com/posts/daily-byte-english",
        customImage: "https://raw.githubusercontent.com/S4lXLV/imgz/refs/heads/main/daily-byte-english.png",
        description: "A lightweight Chrome extension that delivers daily English learning content in small, digestible portions.",
        languages: ["JavaScript", "HTML", "CSS"],
        featured: true,
        stars: '-',
        forks: '-'
    },
    {
        name: "Twitter-X-Cleaner",
        github: "S4lXLV/Twitter-X-Cleaner", // Will auto-fetch from GitHub
        chromeStore: "https://chromewebstore.google.com/detail/twitterx-cleaner/hgmgflgcnpfoaldhklmifmkclbmooame",
        productHunt: null,
        customImage: "https://raw.githubusercontent.com/S4lXLV/imgz/refs/heads/main/Twitter-X-Cleaner.png",
        description: "Clean up your Twitter/X feed by removing unwanted content and distractions.",
        languages: ["JavaScript", "HTML", "CSS"],
        featured: false,
        stars: '?',
        forks: '?'
    },
    {
        name: "Reddit-Copycat",
        github: "S4lXLV/Reddit-Copycat",
        chromeStore: "https://chromewebstore.google.com/detail/reddit-copycat/dlbgdjjfgmdobjcjdlohjfgmkeljeegp",
        productHunt: null,
        customImage: "https://raw.githubusercontent.com/S4lXLV/imgz/refs/heads/main/Reddit-Copycat.png",
        description: "Easily copy Reddit posts and comments with proper formatting.",
        languages: ["JavaScript", "HTML", "CSS"],
        featured: false,
        stars: '?',
        forks: '?'
    },
    {
        name: "Reddit Image Saver – No WebP",
        chromeStore: "https://chromewebstore.google.com/detail/reddit-image-saver-%E2%80%93-no-w/iaeaknlkmgpimfmglnaifiemmmhmfmde",
        productHunt: "https://www.producthunt.com/products/reddit-image-saver-no-webp",
        customImage: "https://raw.githubusercontent.com/S4lXLV/imgz/refs/heads/main/Reddit-Image-Saver.png",
        description: "A lightweight Chrome extension that saves Reddit images in their original quality and without WebP compression.",
        languages: ["JavaScript", "HTML", "CSS"],
        featured: false,
        stars: '-',
        forks: '-'
    },
    {
        name: "Reddit Subreddit Notifier",
        github: "S4lXLV/reddit-notifier", // Will auto-fetch from GitHub
        chromeStore: "https://chromewebstore.google.com/detail/reddit-subreddit-notifier/lainjaephajkoglhagafcidgjoomhach",
        productHunt: null,
        description: "Get instant desktop notifications for new posts in your favorite subreddits. Setup keyword monitoring and stay updated.",
        languages: ["JavaScript", "HTML", "CSS"],
        featured: false,
        stars: '?',
        forks: '?'
    }
    // Add more projects here following the same pattern!
];

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

// Fetch with timeout helper
async function fetchWithTimeout(url, options = {}, timeout = FETCH_TIMEOUT) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
        const response = await fetch(url, {
            ...options,
            signal: controller.signal
        });
        clearTimeout(timeoutId);
        return response;
    } catch (error) {
        clearTimeout(timeoutId);
        throw error;
    }
}

// Fetch repository data from GitHub (optimized)
async function fetchRepoData(repoUrl, projectConfig = null) {
    // Try to get data from cache first
    const cachedData = getFromCache(repoUrl);
    if (cachedData) {
        console.log('Using cached data for', repoUrl);
        // Merge with project config for updated links
        if (projectConfig) {
            return { ...cachedData, ...projectConfig, name: cachedData.name };
        }
        return cachedData;
    }

    try {
        // Fetch from GitHub API if no cache (with timeout)
        console.log('Fetching fresh data for', repoUrl);
        let response = await fetchWithTimeout(`${GITHUB_API_BASE}/${repoUrl}`, { headers });

        if (response.status === 403) {
            console.warn('Rate limited by GitHub API, using fallback method...');
            const fallbackData = await fetchRepoDataFallback(repoUrl, projectConfig);
            if (fallbackData) saveToCache(repoUrl, fallbackData);
            return fallbackData;
        }

        if (!response.ok) {
            throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();

        // Fetch languages (with timeout)
        const languagesResponse = await fetchWithTimeout(data.languages_url, { headers });
        const languages = await languagesResponse.json();

        // Use custom image directly (no validation to save time)
        const imageUrl = projectConfig?.customImage || `https://opengraph.githubassets.com/1/${repoUrl}`;

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
            lastUpdated: Date.now(),
            // Merge project config data
            ...(projectConfig && {
                chromeStore: projectConfig.chromeStore,
                productHunt: projectConfig.productHunt,
                featured: projectConfig.featured
            })
        };

        // Save the fresh data to cache
        saveToCache(repoUrl, repoData);
        return repoData;
    } catch (error) {
        console.error(`Error fetching repo data for ${repoUrl}:`, error);
        const fallbackData = await fetchRepoDataFallback(repoUrl, projectConfig);
        if (fallbackData) saveToCache(repoUrl, fallbackData);
        return fallbackData;
    }
}

// Fallback method when API fails
function fetchRepoDataFallback(repoUrl, projectConfig = null) {
    try {
        // Extract owner and repo from URL
        const [owner, repo] = repoUrl.split('/');

        // Use GitHub's public URL to get basic info
        const imageUrl = getRepositoryImage(repoUrl, projectConfig);

        return {
            name: repo,
            description: projectConfig?.description || 'Repository information temporarily unavailable',
            stars: projectConfig?.stars || '?',
            forks: projectConfig?.forks || '?',
            languages: projectConfig?.languages || [],
            homepage: `https://github.com/${repoUrl}`,
            html_url: `https://github.com/${repoUrl}`,
            topics: [],
            image: imageUrl,
            // Merge project config data
            ...(projectConfig && {
                chromeStore: projectConfig.chromeStore,
                productHunt: projectConfig.productHunt,
                featured: projectConfig.featured
            })
        };
    } catch (error) {
        console.error('Fallback method failed:', error);
        return null;
    }
}

// Helper function to find project config by name
function getProjectConfig(projectName) {
    return PROJECTS.find(p => p.name === projectName || p.github?.split('/')[1] === projectName);
}

// Get repository image (optimized - no validation requests)
function getRepositoryImage(repoUrl, projectConfig = null) {
    // Check for custom image from project config first
    if (projectConfig?.customImage) {
        return projectConfig.customImage;
    }

    // Extract repo name from URL
    const repoName = repoUrl.split('/')[1];

    // Try to find project config by repo name
    const config = projectConfig || getProjectConfig(repoName);
    if (config?.customImage) {
        return config.customImage;
    }

    // Use GitHub's OpenGraph image (always works, no validation needed)
    return `https://opengraph.githubassets.com/1/${repoUrl}`;
}

// Create project card HTML
function createProjectCard(project) {
    if (!project) return '';

    // Determine if it's an open source project (has GitHub repo)
    const isOpenSource = project.html_url && project.html_url.includes('github.com');

    // Build links array
    const links = [];

    if (isOpenSource) {
        links.push({
            url: project.html_url,
            icon: 'fab fa-github',
            text: 'GitHub'
        });
    }

    if (project.chromeStore) {
        links.push({
            url: project.chromeStore,
            icon: 'fab fa-chrome',
            text: 'Chrome Store'
        });
    }

    if (project.productHunt) {
        links.push({
            url: project.productHunt,
            icon: 'fab fa-product-hunt',
            text: 'Product Hunt'
        });
    }

    if (project.homepage && !project.chromeStore && isOpenSource) {
        links.push({
            url: project.homepage,
            icon: 'fas fa-external-link-alt',
            text: 'Demo'
        });
    }

    return `
        <article class="project-card ${project.featured ? 'featured-project' : ''}">
            <div class="project-content">
                ${project.featured ? '<span class="featured-badge"><i class="fas fa-star"></i> Featured Project</span>' : ''}
                <div class="project-image">
                    <a href="${links[0]?.url || '#'}" target="_blank" aria-label="View ${project.name}">
                        <img src="${project.image}" alt="${project.name}" loading="lazy" onerror="this.src='https://raw.githubusercontent.com/github/explore/master/topics/github/github.png'">
                    </a>
                </div>
                <h3>${project.name}</h3>
                <p>${project.description}</p>
                <div class="project-tech">
                    ${project.languages.map(lang => `<span>${lang}</span>`).join('')}
                </div>
                ${isOpenSource ? `
                    <div class="project-stats">
                        <span><i class="fas fa-star"></i> ${project.stars}</span>
                        <span><i class="fas fa-code-branch"></i> ${project.forks}</span>
                    </div>
                ` : ''}
                <div class="project-links">
                    ${links.map(link => `
                        <a href="${link.url}" class="project-link" target="_blank">
                            <i class="${link.icon}"></i> ${link.text}
                        </a>
                    `).join('')}
                </div>
            </div>
        </article>
    `;
}

// Process a single project configuration
async function processProject(projectConfig) {
    // If it has a GitHub repo, fetch data from GitHub
    if (projectConfig.github) {
        const githubData = await fetchRepoData(projectConfig.github, projectConfig);
        return githubData;
    }

    // Otherwise, use the manual configuration
    return {
        name: projectConfig.name,
        description: projectConfig.description || 'No description available',
        stars: '-',
        forks: '-',
        languages: projectConfig.languages || [],
        html_url: projectConfig.chromeStore || projectConfig.productHunt || '#',
        image: projectConfig.customImage || 'https://raw.githubusercontent.com/github/explore/master/topics/github/github.png',
        chromeStore: projectConfig.chromeStore,
        productHunt: projectConfig.productHunt,
        featured: projectConfig.featured || false
    };
}

// Load and render projects (optimized with immediate display)
async function loadProjects() {
    const projectGrid = document.querySelector('.project-grid');
    if (!projectGrid) return;

    // Show projects immediately with placeholder data
    projectGrid.innerHTML = '<div class="loading">Loading projects...</div>';

    try {
        // Process all projects - use Promise.allSettled to handle failures gracefully
        const projectPromises = PROJECTS.map(config =>
            processProject(config).catch(err => {
                console.warn(`Failed to load project ${config.name}:`, err);
                return null;
            })
        );

        const results = await Promise.allSettled(projectPromises);
        const validProjects = results
            .filter(result => result.status === 'fulfilled' && result.value !== null)
            .map(result => result.value);

        if (validProjects.length === 0) {
            projectGrid.innerHTML = '<p>No projects found</p>';
            return;
        }

        // Sort: featured first, then by name
        validProjects.sort((a, b) => {
            if (a.featured && !b.featured) return -1;
            if (!a.featured && b.featured) return 1;
            return a.name.localeCompare(b.name);
        });

        projectGrid.innerHTML = validProjects.map(project => createProjectCard(project)).join('');
    } catch (error) {
        console.error('Error loading projects:', error);
        projectGrid.innerHTML = '<p>Error loading projects. Please refresh the page.</p>';
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

// Initialize when DOM is loaded (optimized with immediate loading)
document.addEventListener('DOMContentLoaded', () => {
    clearExpiredCache(); // Clean up expired cache entries

    // Load projects immediately without waiting for scroll
    loadProjects();
});

// Export functions for potential reuse
export { loadProjects }; 
