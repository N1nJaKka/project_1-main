document.addEventListener('DOMContentLoaded', function() {
    const preloader = document.querySelector('.preloader');
    const content = document.querySelector('.content');

    function hidePreloader() {
        if (preloader && content) {
            preloader.classList.add('preloader--hidden');
            content.classList.remove('content--hidden');
            preloader.addEventListener('transitionend', () => {
                preloader.remove();
            });
        }
    }

    setTimeout(hidePreloader, 1500);
    window.addEventListener('load', hidePreloader);

    const filterForm = document.querySelector('.filter-form');
    const experienceFilters = filterForm ? filterForm.querySelectorAll('input[name="experience"]') : [];
    const specializationSelect = filterForm ? filterForm.querySelector('#specialization-select') : null;
    const locationFilter = filterForm ? filterForm.querySelector('#location-select') : null;
    const costMinFilter = filterForm ? filterForm.querySelector('#cost-min') : null;
    const costMaxFilter = filterForm ? filterForm.querySelector('#cost-max') : null;
    const applyFiltersButton = filterForm ? filterForm.querySelector('.filter-form__button') : null;

    function saveFiltersToLocalStorage() {
        if (!filterForm) return;

        const filters = {
            specialization: specializationSelect ? specializationSelect.value : '',
            experience: Array.from(experienceFilters).find(radio => radio.checked)?.value || 'any',
            location: locationFilter ? locationFilter.value : '',
            costMin: costMinFilter ? costMinFilter.value : '',
            costMax: costMaxFilter ? costMaxFilter.value : ''
        };
        localStorage.setItem('trainerFilters', JSON.stringify(filters));
    }

    function loadFiltersFromLocalStorage() {
        if (!filterForm) return;

        const savedFilters = localStorage.getItem('trainerFilters');
        if (savedFilters) {
            const filters = JSON.parse(savedFilters);
            if (specializationSelect) specializationSelect.value = filters.specialization;
            if (locationFilter) locationFilter.value = filters.location;
            if (costMinFilter) costMinFilter.value = filters.costMin;
            if (costMaxFilter) costMaxFilter.value = filters.costMax;

            experienceFilters.forEach(radio => {
                if (radio.value === filters.experience) {
                    radio.checked = true;
                }
            });
        }
    }

    loadFiltersFromLocalStorage();

    if (filterForm) {
        filterForm.addEventListener('change', saveFiltersToLocalStorage);
        filterForm.addEventListener('input', saveFiltersToLocalStorage);
    }

    const trainerCardsContainer = document.getElementById('trainer-cards-container');
    const trainerTitlesList = document.getElementById('trainer-titles-list');
    let allTrainerCardsData = [];
    let allReviewsData = [];

    async function generateImageForTrainer(trainerName, specialization) {
        const placeholderText = encodeURIComponent(trainerName.split(' ')[0] || 'Тренер');
        return `https://placehold.co/150x150/ef4444/ffffff?text=${placeholderText}`;
    }

    async function loadData() {
        console.log("Начинаем загрузку данных...");
        try {
            const response = await fetch('../data.json'); 
            if (!response.ok) {
                console.warn("Ошибка при загрузке data.json: Проверьте путь и запуск через локальный сервер.", response.status, response.statusText);
                try {
                    const data = await response.json();
                    allTrainerCardsData = data.filter(item => item.id.startsWith('trainer'));
                    allReviewsData = data.filter(item => item.id.startsWith('review'));
                    console.log("Данные загружены, несмотря на !response.ok:", { allTrainerCardsData, allReviewsData });
                } catch (jsonError) {
                    throw new Error(`Не удалось распарсить JSON: ${jsonError.message}`);
                }
            } else {
                const data = await response.json();
                allTrainerCardsData = data.filter(item => item.id.startsWith('trainer'));
                allReviewsData = data.filter(item => item.id.startsWith('review'));
                console.log("Данные успешно загружены из data.json:", { allTrainerCardsData, allReviewsData });
            }

            await renderTrainerCards(allTrainerCardsData);
            extractAndDisplayTrainerTitles(allTrainerCardsData);
            initializeSwiper();
            renderReviews(allReviewsData, allTrainerCardsData);

        } catch (error) {
            console.error("Критическая ошибка при загрузке или обработке данных:", error);
            if (trainerCardsContainer) {
                trainerCardsContainer.innerHTML = `<p>Не удалось загрузить информацию о тренерах. Пожалуйста, попробуйте позже. Ошибка: ${error.message}</p>`;
            }
            const reviewsContainer = document.getElementById('reviews-container');
            if (reviewsContainer) {
                reviewsContainer.innerHTML = `<p>Не удалось загрузить информацию об отзывах. Пожалуйста, попробуйте позже. Ошибка: ${error.message}</p>`;
            }
        }
    }

    async function renderTrainerCards(trainers) {
        if (!trainerCardsContainer) {
            console.error("Элемент trainer-cards-container не найден.");
            return;
        }

        trainerCardsContainer.innerHTML = '';
        if (trainers.length === 0) {
            trainerCardsContainer.innerHTML = '<p>Тренеры не найдены по заданным критериям.</p>';
            console.log("Тренеры для рендера: 0. Выводим сообщение 'Тренеры не найдены'.");
            return;
        }

        console.log("Рендеринг тренеров. Количество:", trainers.length);
        for (const trainer of trainers) {
            const trainerCard = document.createElement('div');
            trainerCard.classList.add('trainer-card', 'swiper-slide');
            trainerCard.setAttribute('data-specialization', trainer.specialization);
            trainerCard.setAttribute('data-location', trainer.location);
            trainerCard.setAttribute('data-cost', trainer.cost);
            trainerCard.setAttribute('data-experience', trainer.experience);

            let imageUrl = trainer.image;
            if (!imageUrl) { 
                const placeholderText = encodeURIComponent(trainer.name.split(' ')[0] || 'Тренер');
                imageUrl = `https://placehold.co/150x150/ef4444/ffffff?text=${placeholderText}`; 
            }

            trainerCard.innerHTML = `
                <figure class="trainer-card__figure">
                    <img src="${imageUrl}" alt="Фото ${trainer.name}" class="trainer-card__image" width="150" height="150">
                </figure>
                <h3 class="trainer-card__name">${trainer.name}</h3>
                <p class="trainer-card__specialization">${trainer.specialization}</p>
                <p class="trainer-card__experience">Опыт: ${trainer.experience}</p>
                <p class="trainer-card__location">Местоположение: ${trainer.location}</p>
                <p class="trainer-card__rating">Рейтинг: ${trainer.rating} <i class="fas fa-star"></i></p>
                <p class="trainer-card__cost">Стоимость: ${trainer.cost} руб./час</p>
                <p class="trainer-card__description">${trainer.description}</p>
                <a href="#${trainer.id}" class="trainer-card__link">Подробнее о тренере</a>
            `;
            trainerCardsContainer.appendChild(trainerCard);
        }
        console.log("Рендеринг тренеров завершен.");
    }

    function extractAndDisplayTrainerTitles(trainers) {
        if (!trainerTitlesList) {
            console.error("Элемент trainer-titles-list не найден.");
            return;
        }

        trainerTitlesList.innerHTML = '';
        const trainerNames = trainers.map(trainer => trainer.name);

        if (trainerNames.length > 0) {
            trainerNames.forEach(name => {
                const listItem = document.createElement('li');
                listItem.classList.add('trainer-titles-list__item');
                listItem.textContent = name;
                trainerTitlesList.appendChild(listItem);
            });
        } else {
            const listItem = document.createElement('li');
            listItem.textContent = "Имена тренеров не найдены.";
            trainerTitlesList.appendChild(listItem);
        }
        console.log("Список имен тренеров обновлен.");
    }

    const reviewsContainer = document.getElementById('reviews-container');

    function renderReviews(reviews, trainers) {
        if (!reviewsContainer) {
            console.error("Элемент reviews-container не найден.");
            return;
        }

        reviewsContainer.innerHTML = '';
        console.log("Рендеринг отзывов. Количество:", reviews.length);

        if (reviews.length === 0) {
            reviewsContainer.innerHTML = '<p>Отзывов пока нет.</p>';
            return;
        }

        reviews.forEach(review => {
            const trainer = trainers.find(t => t.id === review.trainerId);
            const trainerName = trainer ? trainer.name : 'Неизвестный тренер';

            const reviewCard = document.createElement('div');
            reviewCard.classList.add('review-card');

            let starsHtml = '';
            for (let i = 0; i < 5; i++) {
                if (i < review.rating) {
                    starsHtml += '<i class="fas fa-star"></i>';
                } else {
                    starsHtml += '<i class="far fa-star"></i>';
                }
            }

            reviewCard.innerHTML = `
                <div class="review-card__header">
                    <div class="review-card__user-info">
                        <i class="fas fa-user-circle review-card__user-icon"></i>
                        <span class="review-card__user-name">${review.userName}</span>
                    </div>
                    <div class="review-card__rating">${starsHtml}</div>
                </div>
                <p class="review-card__text">${review.text}</p>
                <div class="review-card__footer">
                    <span class="review-card__trainer-name">Тренер: ${trainerName}</span>
                    <span class="review-card__date">${review.date}</span>
                </div>
            `;
            reviewsContainer.appendChild(reviewCard);
        });
        console.log("Рендеринг отзывов завершен.");
    }

    const popularArticlesContainer = document.getElementById('articles-container');

    const popularArticlesData = [
        {
            title: "Как выбрать идеального фитнес-тренера?",
            link: "#article1",
            icon: "fas fa-dumbbell",
            description: "Советы по поиску специалиста, который поможет вам достичь ваших целей в фитнесе."
        },
        {
            title: "Йога для начинающих: первые шаги",
            link: "#article2",
            icon: "fas fa-leaf",
            description: "Руководство для тех, кто только начинает свой путь в мире йоги."
        },
        {
            title: "Психология успеха: роль коуча в вашей жизни",
            link: "#article3",
            icon: "fas fa-brain",
            description: "Узнайте, как коучинг может помочь вам раскрыть свой потенциал."
        }
    ];

    function renderPopularArticles() {
        if (!popularArticlesContainer) {
            console.error("Элемент articles-container не найден.");
            return;
        }
        popularArticlesContainer.innerHTML = '';

        popularArticlesData.forEach(article => {
            const articleItem = document.createElement('div');
            articleItem.classList.add('article-item');
            articleItem.innerHTML = `
                <h3 class="article-item__title"><a href="${article.link}">${article.title}</a></h3>
                <p class="article-item__description"><i class="${article.icon}"></i> ${article.description}</p>
            `;
            popularArticlesContainer.appendChild(articleItem);
        });
        console.log("Популярные статьи отрендерены.");
    }

    const scrollToTopBtn = document.getElementById('scrollToTopBtn');

    window.addEventListener('scroll', function() {
        if (scrollToTopBtn) {
            if (window.pageYOffset > 300) {
                scrollToTopBtn.style.display = 'block';
            } else {
                scrollToTopBtn.style.display = 'none';
            }
        }
    });

    if (scrollToTopBtn) {
        scrollToTopBtn.addEventListener('click', function() {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        });
    }

    let mySwiper;

    function initializeSwiper() {
        if (mySwiper) {
            mySwiper.destroy(true, true);
            mySwiper = null;
            console.log("Существующий экземпляр Swiper уничтожен.");
        }

        const swiperContainer = document.querySelector('.swiper-container');
        if (swiperContainer && trainerCardsContainer && trainerCardsContainer.children.length > 0) {
            mySwiper = new Swiper(swiperContainer, {
                loop: true,
                slidesPerView: 1,
                spaceBetween: 20,
                pagination: {
                    el: '.swiper-pagination',
                    clickable: true,
                },
                navigation: {
                    nextEl: '.swiper-button-next',
                    prevEl: '.swiper-button-prev',
                },
                breakpoints: {
                    640: {
                        slidesPerView: 2,
                        spaceBetween: 30
                    },
                    1024: {
                        slidesPerView: 3,
                        spaceBetween: 40
                    }
                },
                observer: true,
                observeParents: true
            });
            console.log("Swiper инициализирован.");
        } else {
            console.log("Swiper не инициализирован: нет карточек тренеров или swiper-container не найден.");
        }
    }

    const searchButton = document.querySelector('.header__search-button');
    if (searchButton) {
        searchButton.addEventListener('click', function(event) {
            console.log("Кнопка поиска нажата (логика пока не реализована).");
        });
    }

    if (applyFiltersButton) {
        applyFiltersButton.addEventListener('click', function(event) {
            event.preventDefault();
            console.log("Кнопка 'Применить фильтры' нажата. Применяем фильтры...");

            const selectedSpecialization = specializationSelect ? specializationSelect.value : '';
            const selectedExperience = Array.from(experienceFilters).find(radio => radio.checked)?.value || 'any';
            const selectedLocation = locationFilter ? locationFilter.value : '';
            const minCost = costMinFilter && costMinFilter.value !== '' ? parseFloat(costMinFilter.value) : 0;
            const maxCost = costMaxFilter && costMaxFilter.value !== '' ? parseFloat(costMaxFilter.value) : Infinity;

            console.log("Выбранные фильтры:");
            console.log("  Специализация:", selectedSpecialization);
            console.log("  Опыт:", selectedExperience);
            console.log("  Местоположение:", selectedLocation);
            console.log("  Минимальная стоимость:", minCost);
            console.log("  Максимальная стоимость:", maxCost);

            const filteredTrainers = allTrainerCardsData.filter(trainer => {
                const matchesSpecialization = selectedSpecialization === '' || trainer.specialization.includes(selectedSpecialization);
                const matchesLocation = selectedLocation === '' || trainer.location === selectedLocation;
                const matchesCost = trainer.cost >= minCost && trainer.cost <= maxCost;

                let matchesExperience = true;
                if (selectedExperience !== 'any') {
                    const trainerExpValueMatch = trainer.experience.match(/\d+/);
                    const trainerExpYears = trainerExpValueMatch ? parseInt(trainerExpValueMatch[0], 10) : 0;
                    
                    if (selectedExperience === '1-3') {
                        matchesExperience = (trainerExpYears >= 1 && trainerExpYears <= 3);
                    } else if (selectedExperience === '3-5') {
                        matchesExperience = (trainerExpYears >= 3 && trainerExpYears <= 5);
                    } else if (selectedExperience === '5+') {
                        matchesExperience = (trainerExpYears >= 5);
                    }
                }
                return matchesSpecialization && matchesLocation && matchesCost && matchesExperience;
            });

            console.log("Отфильтрованные тренеры. Количество:", filteredTrainers.length, filteredTrainers);
            renderTrainerCards(filteredTrainers);
            initializeSwiper();
        });
    }

    const currentYearSpan = document.getElementById('current-year');
    if (currentYearSpan) {
        currentYearSpan.textContent = new Date().getFullYear();
    }

    document.body.addEventListener('click', function(event) {
        const trainerCardLink = event.target.closest('.trainer-card__link');
        if (trainerCardLink) {
            const href = trainerCardLink.getAttribute('href');
            if (href && href.startsWith('#')) {
                event.preventDefault();
                const targetId = href.substring(1);
                const targetElement = document.getElementById(targetId);
                if (targetElement) {
                    targetElement.scrollIntoView({ behavior: 'smooth' });
                }
            }
        }
    });

    const navigationLinks = document.querySelectorAll('.header__navigation-link, .footer__navigation-link');

    navigationLinks.forEach(link => {
        link.addEventListener('click', function(event) {
            const href = this.getAttribute('href');
            if (href && href.startsWith('#')) {
                event.preventDefault();
                const targetId = href.substring(1);
                const targetElement = document.getElementById(targetId);

                if (targetElement) {
                    targetElement.scrollIntoView({ behavior: 'smooth' });
                }
            }
        });
    });

    document.body.addEventListener('mouseover', function(event) {
        const trainerCard = event.target.closest('.trainer-card');
        if (trainerCard) {
            const trainerNameElement = trainerCard.querySelector('.trainer-card__name');
            const trainerName = trainerNameElement ? trainerNameElement.textContent : '';
        }
    });

    document.body.addEventListener('mouseout', function(event) {
        const trainerCard = event.target.closest('.trainer-card');
        if (trainerCard) {
            const trainerNameElement = trainerCard.querySelector('.trainer-card__name');
            const trainerName = trainerNameElement ? trainerNameElement.textContent : '';
        }
    });

    loadData();
    renderPopularArticles();
});
