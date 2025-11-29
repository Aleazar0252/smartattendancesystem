document.addEventListener('DOMContentLoaded', function() {
    // Initialize Firebase services
    const auth = firebase.auth();
    const db = firebase.firestore();

    // Load news content from existing Firestore data
    loadNewsData();

    // Highlight current page in navigation
    const currentPage = window.location.pathname.split('/').pop();
    const navLinks = document.querySelectorAll('.nav-links a');

    navLinks.forEach(link => {
        if (link.getAttribute('href') === currentPage) {
            link.style.color = 'var(--accent)';
            link.style.fontWeight = '700';
        }
    });

    // Initialize newsletter subscription
    initNewsletter();

    // ==================== FIRESTORE FUNCTIONS ====================

    // Load news data from Firestore
    async function loadNewsData() {
        const newsContainer = document.getElementById('news-container');
        
        try {
            const querySnapshot = await db.collection('HomePage_news')
                .orderBy('order')
                .limit(6)
                .get();

            if (!querySnapshot.empty) {
                newsContainer.innerHTML = ''; // Clear loading state
                
                querySnapshot.forEach((doc) => {
                    const news = doc.data();
                    const newsCard = createNewsCard(news);
                    newsContainer.appendChild(newsCard);
                });
                
                // Add animation to news cards
                setTimeout(() => {
                    const newsCards = document.querySelectorAll('.news-card');
                    newsCards.forEach((card, index) => {
                        card.style.opacity = '0';
                        card.style.transform = 'translateY(30px)';
                        card.style.transition = 'all 0.6s ease-out';
                        
                        setTimeout(() => {
                            card.style.opacity = '1';
                            card.style.transform = 'translateY(0)';
                        }, index * 200);
                    });
                }, 100);
            } else {
                showNoNewsMessage(newsContainer);
            }
        } catch (error) {
            console.error('Error loading news:', error);
            showErrorMessage(newsContainer);
        }
    }

    // Show message when no news is found
    function showNoNewsMessage(container) {
        container.innerHTML = `
            <div class="no-news-message">
                <i class="fas fa-newspaper" style="font-size: 3em; color: #ccc; margin-bottom: 20px;"></i>
                <h3>No News Available</h3>
                <p>Check back later for the latest updates from Zamboanga Sibugay National High School.</p>
            </div>
        `;
    }

    // Show error message
    function showErrorMessage(container) {
        container.innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-triangle" style="font-size: 3em; margin-bottom: 20px;"></i>
                <h3>Error Loading News</h3>
                <p>Unable to load news at this time. Please refresh the page or try again later.</p>
                <button onclick="location.reload()" style="margin-top: 15px; padding: 10px 20px; background: var(--primary); color: white; border: none; border-radius: 5px; cursor: pointer;">
                    <i class="fas fa-redo"></i> Refresh Page
                </button>
            </div>
        `;
    }

    // Create HTML for a news card
    function createNewsCard(news) {
        const article = document.createElement('article');
        article.className = 'news-card';
        article.innerHTML = `
            <img src="${news.image_url}" 
                 alt="${news.title}" 
                 class="news-image"
                 onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAwIiBoZWlnaHQ9IjQwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZThlOGU4Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIyMCIgZmlsbD0iIzY2NiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPk5ld3MgSW1hZ2U8L3RleHQ+PC9zdmc+'">
            <div class="news-content">
                <span class="news-date">${news.date}</span>
                <h3 class="news-title">${news.title}</h3>
                <p class="news-excerpt">${news.excerpt}</p>
                <a href="${news.read_more_link}" class="read-more">Read more <i class="fas fa-arrow-right"></i></a>
            </div>
        `;
        return article;
    }

    // Initialize newsletter subscription
    function initNewsletter() {
        const newsletterForm = document.getElementById('newsletter-form');
        
        if (newsletterForm) {
            newsletterForm.addEventListener('submit', async function(e) {
                e.preventDefault();
                
                const emailInput = document.getElementById('newsletter-email');
                const email = emailInput.value.trim();
                const submitButton = newsletterForm.querySelector('button');
                
                if (email && isValidEmail(email)) {
                    await subscribeToNewsletter(email, submitButton);
                } else {
                    showNotification('Please enter a valid email address.', 'error');
                }
            });
        }
    }

    // Subscribe to newsletter
    async function subscribeToNewsletter(email, submitButton) {
        const originalButtonText = submitButton.innerHTML;
        
        try {
            // Show loading state
            submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
            submitButton.disabled = true;

            // Check if email already exists
            const existingSubscription = await db.collection('newsletter_subscriptions')
                .where('email', '==', email)
                .where('active', '==', true)
                .limit(1)
                .get();

            if (!existingSubscription.empty) {
                showNotification('This email is already subscribed to our newsletter!', 'info');
                return;
            }

            // Add new subscription
            await db.collection('newsletter_subscriptions').add({
                email: email,
                subscribed_at: firebase.firestore.FieldValue.serverTimestamp(),
                active: true,
                ip_address: await getClientIP()
            });

            showNotification('Thank you for subscribing to our newsletter!', 'success');
            document.getElementById('newsletter-form').reset();
            
        } catch (error) {
            console.error('Error subscribing to newsletter:', error);
            showNotification('Sorry, there was an error subscribing. Please try again.', 'error');
        } finally {
            // Restore button state
            submitButton.innerHTML = originalButtonText;
            submitButton.disabled = false;
        }
    }

    // Utility function to validate email
    function isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    // Utility function to get client IP (simplified)
    async function getClientIP() {
        try {
            const response = await fetch('https://api.ipify.org?format=json');
            const data = await response.json();
            return data.ip;
        } catch (error) {
            return 'unknown';
        }
    }

    // Show notification message
    function showNotification(message, type = 'info') {
        // Remove existing notifications
        const existingNotification = document.querySelector('.custom-notification');
        if (existingNotification) {
            existingNotification.remove();
        }

        const notification = document.createElement('div');
        notification.className = `custom-notification ${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas ${getNotificationIcon(type)}"></i>
                <span>${message}</span>
                <button class="notification-close" onclick="this.parentElement.parentElement.remove()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;

        // Add styles if not already added
        if (!document.querySelector('#notification-styles')) {
            const styles = document.createElement('style');
            styles.id = 'notification-styles';
            styles.textContent = `
                .custom-notification {
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    background: white;
                    padding: 15px 20px;
                    border-radius: 8px;
                    box-shadow: 0 5px 15px rgba(0,0,0,0.2);
                    z-index: 10000;
                    border-left: 4px solid;
                    max-width: 400px;
                    animation: slideInRight 0.3s ease;
                }
                .custom-notification.success {
                    border-left-color: #28a745;
                    background: #d4edda;
                    color: #155724;
                }
                .custom-notification.error {
                    border-left-color: #dc3545;
                    background: #f8d7da;
                    color: #721c24;
                }
                .custom-notification.info {
                    border-left-color: #17a2b8;
                    background: #d1ecf1;
                    color: #0c5460;
                }
                .notification-content {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                }
                .notification-close {
                    background: none;
                    border: none;
                    cursor: pointer;
                    padding: 5px;
                    margin-left: auto;
                }
                @keyframes slideInRight {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
            `;
            document.head.appendChild(styles);
        }

        document.body.appendChild(notification);

        // Auto remove after 5 seconds
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 5000);
    }

    // Get appropriate icon for notification type
    function getNotificationIcon(type) {
        switch (type) {
            case 'success': return 'fa-check-circle';
            case 'error': return 'fa-exclamation-circle';
            case 'info': return 'fa-info-circle';
            default: return 'fa-bell';
        }
    }

    // ==================== REAL-TIME UPDATES ====================

    // Optional: Set up real-time listeners for news updates
    function setupRealtimeListeners() {
        // Listen for news updates
        db.collection('HomePage_news')
            .orderBy('order')
            .limit(6)
            .onSnapshot((querySnapshot) => {
                const newsContainer = document.getElementById('news-container');
                newsContainer.innerHTML = '';
                
                if (!querySnapshot.empty) {
                    querySnapshot.forEach((doc) => {
                        const news = doc.data();
                        const newsCard = createNewsCard(news);
                        newsContainer.appendChild(newsCard);
                    });
                } else {
                    showNoNewsMessage(newsContainer);
                }
                
                console.log('News updated in real-time from HomePage_news');
            }, (error) => {
                console.error('Error in news real-time listener:', error);
                showErrorMessage(document.getElementById('news-container'));
            });
    }

    // Uncomment the line below if you want real-time updates
    // setupRealtimeListeners();
});

// Global error handler for uncaught errors
window.addEventListener('error', function(e) {
    console.error('Global error:', e.error);
});