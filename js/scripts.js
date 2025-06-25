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

    // Эта функция не будет использоваться, так как изображения теперь заданы в data.json
    async function generateImageForTrainer(trainerName, specialization) {
        const placeholderText = encodeURIComponent(trainerName.split(' ')[0] || 'Тренер');
        return `https://placehold.co/150x150/ef4444/ffffff?text=${placeholderText}`;
    }

    async function loadTrainers() {
        console.log("Начинаем загрузку данных о тренерах...");
        try {
            // Исправленный путь к data.json для локальной работы (одна папка вверх от js/)
            const response = await fetch('../data.json'); 
            if (!response.ok) {
                // В случае локального доступа fetch.ok может быть false, но данные могут быть прочитаны
                // Для локальных файлов ERR_FILE_NOT_FOUND и CORS могут быть проблемой,
                // поэтому важно запускать через Live Server.
                console.warn("Ошибка при загрузке data.json: Проверьте путь и запуск через локальный сервер.", response.status, response.statusText);
                // Попробуем прочитать тело ответа, даже если !response.ok
                try {
                    allTrainerCardsData = await response.json();
                    console.log("Данные загружены, несмотря на !response.ok (возможно, из-за CORS/file:// протокола):", allTrainerCardsData);
                } catch (jsonError) {
                    throw new Error(`Не удалось распарсить JSON: ${jsonError.message}`);
                }
            } else {
                allTrainerCardsData = await response.json();
                console.log("Данные успешно загружены из data.json:", allTrainerCardsData);
            }

            await renderTrainerCards(allTrainerCardsData);
            extractAndDisplayTrainerTitles(allTrainerCardsData);
            initializeSwiper();

        } catch (error) {
            console.error("Критическая ошибка при загрузке или обработке данных о тренерах:", error);
            if (trainerCardsContainer) {
                trainerCardsContainer.innerHTML = `<p>Не удалось загрузить информацию о тренерах. Пожалуйста, попробуйте позже. Ошибка: ${error.message}</p>`;
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
            // Если изображение не указано в data.json или путь некорректен, используем заглушку
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
        // Проверяем, существует ли уже экземпляр Swiper
        if (mySwiper) {
            mySwiper.destroy(true, true); // Уничтожаем существующий экземпляр
            mySwiper = null; // Сбрасываем ссылку
            console.log("Существующий экземпляр Swiper уничтожен.");
        }

        // Инициализируем Swiper только если есть карточки тренеров и swiper-container существует
        const swiperContainer = document.querySelector('.swiper-container');
        if (swiperContainer && trainerCardsContainer && trainerCardsContainer.children.length > 0) {
            mySwiper = new Swiper(swiperContainer, { // Передаем элемент, а не селектор повторно
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
                // scrollbar: { // Закомментировано, если скроллбар не нужен
                //     el: '.swiper-scrollbar',
                // },
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
                observer: true, // Включаем observer
                observeParents: true // Включаем observeParents
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
            // Логика поиска, если она будет добавлена
        });
    }

    if (applyFiltersButton) {
        applyFiltersButton.addEventListener('click', function(event) {
            event.preventDefault(); // Предотвращаем отправку формы по умолчанию
            console.log("Кнопка 'Применить фильтры' нажата. Применяем фильтры...");

            const selectedSpecialization = specializationSelect ? specializationSelect.value : '';
            const selectedExperience = Array.from(experienceFilters).find(radio => radio.checked)?.value || 'any';
            const selectedLocation = locationFilter ? locationFilter.value : '';
            // Проверяем, что значение не пустая строка перед парсингом
            const minCost = costMinFilter && costMinFilter.value !== '' ? parseFloat(costMinFilter.value) : 0;
            const maxCost = costMaxFilter && costMaxFilter.value !== '' ? parseFloat(costMaxFilter.value) : Infinity;

            console.log("Выбранные фильтры:");
            console.log("  Специализация:", selectedSpecialization);
            console.log("  Опыт:", selectedExperience);
            console.log("  Местоположение:", selectedLocation);
            console.log("  Минимальная стоимость:", minCost);
            console.log("  Максимальная стоимость:", maxCost);

            const filteredTrainers = allTrainerCardsData.filter(trainer => {
                // console.log("  Проверяем тренера:", trainer.name); // Закомментировано для меньшего спама в консоли

                const matchesSpecialization = selectedSpecialization === '' || trainer.specialization.includes(selectedSpecialization);
                // console.log("    matchesSpecialization:", matchesSpecialization, "(Выбрано:", selectedSpecialization, ", Тренер:", trainer.specialization, ")");

                const matchesLocation = selectedLocation === '' || trainer.location === selectedLocation;
                // console.log("    matchesLocation:", matchesLocation, "(Выбрано:", selectedLocation, ", Тренер:", trainer.location, ")");

                const matchesCost = trainer.cost >= minCost && trainer.cost <= maxCost;
                // console.log("    matchesCost:", matchesCost, "(Мин:", minCost, ", Макс:", maxCost, ", Тренер:", trainer.cost, ")");

                let matchesExperience = true;
                if (selectedExperience !== 'any') {
                    // Используем регулярное выражение для более надежного извлечения числа из строки "N лет"
                    const trainerExpValueMatch = trainer.experience.match(/\d+/);
                    const trainerExpYears = trainerExpValueMatch ? parseInt(trainerExpValueMatch[0], 10) : 0;
                    // console.log("    Опыт тренера (парсинг):", trainer.experience, "->", trainerExpYears, "лет");
                    
                    if (selectedExperience === '1-3') {
                        matchesExperience = (trainerExpYears >= 1 && trainerExpYears <= 3);
                    } else if (selectedExperience === '3-5') {
                        matchesExperience = (trainerExpYears >= 3 && trainerExpYears <= 5);
                    } else if (selectedExperience === '5+') {
                        matchesExperience = (trainerExpYears >= 5);
                    }
                }
                // console.log("    matchesExperience:", matchesExperience, "(Выбрано:", selectedExperience, ")");

                const finalMatch = matchesSpecialization && matchesLocation && matchesCost && matchesExperience;
                // console.log("    Финальный результат для", trainer.name, ":", finalMatch);
                return finalMatch;
            });

            console.log("Отфильтрованные тренеры. Количество:", filteredTrainers.length, filteredTrainers);
            renderTrainerCards(filteredTrainers);
            initializeSwiper(); // Повторная инициализация Swiper после фильтрации
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

    loadTrainers();
    renderPopularArticles();
});
