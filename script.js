'use strict';

// prettier-ignore
const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const form = document.querySelector('.form');
const formEdit = document.querySelector('.form__edit');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');

const inputTypeEdit = document.querySelector('.form__input--type--edit');
const inputDistanceEdit = document.querySelector(
  '.form__input--distance--edit'
);
const inputDurationEdit = document.querySelector(
  '.form__input--duration--edit'
);
const inputCadenceEdit = document.querySelector('.form__input--cadence--edit');
const inputElevationEdit = document.querySelector(
  '.form__input--elevation--edit'
);
const btnDeleteAll = document.querySelector('.btn-delete-all');

class Workout {
  date = new Date();
  id = (Date.now() + '').slice(-10);

  constructor(coords, distance, duration) {
    this.coords = coords; // [lat, lon]
    this.distance = distance;
    this.duration = duration;
  }

  _setDescription() {
    // prettier-ignore
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    this.description = `${this.type[0].toUpperCase() + this.type.slice(1)} on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()}`;
  }
}

class Running extends Workout {
  type = 'running';
  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;
    this.calcPace();
    this._setDescription();
  }

  calcPace() {
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}
class Cycling extends Workout {
  type = 'cycling';
  constructor(coords, distance, duration, elevationGain) {
    super(coords, distance, duration);
    this.elevationGain = elevationGain;
    this.calcSpeed();
    this._setDescription();
  }

  calcSpeed() {
    this.speed = this.distance / (this.duration / 60);
    return this.speed;
  }
}

/* const run1 = new Running([39, -12], 5.2, 24, 178);
const cycling1 = new Cycling([39, -12], 37, 95, 523); */

class App {
  #map;
  #mapZoomLevel = 13;
  #mapEvent;
  #workouts = [];
  #markers = [];

  constructor() {
    this._getPosition();

    this._getLocalStorage();

    form.addEventListener('submit', this._newWorkout.bind(this));

    inputType.addEventListener('change', this._toggleElevationField);

    containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));

    containerWorkouts.addEventListener('click', this._deleteWorkout.bind(this));

    containerWorkouts.addEventListener('click', this._editWorkout.bind(this));

    btnDeleteAll.addEventListener('click', this._deleteAllWorkouts.bind(this));
  }

  _getPosition() {
    if (navigator.geolocation)
      navigator.geolocation.getCurrentPosition(
        this._loadMap.bind(this),
        function () {
          alert('Could not get your position');
        }
      );
  }

  _loadMap(position) {
    const { latitude } = position.coords;
    const { longitude } = position.coords;

    const coords = [latitude, longitude];

    this.#map = L.map('map').setView(coords, this.#mapZoomLevel);

    L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    this.#map.on('click', this._showForm.bind(this));

    this.#workouts.forEach((work) => {
      this._renderWorkoutMarker(work);
    });
  }

  _showForm(mapE) {
    this.#mapEvent = mapE;
    form.classList.remove('hidden');
    inputDistance.focus();
  }

  _showEditForm() {
    formEdit.classList.remove('hidden');
    inputDistance.focus();
  }

  _hideForm() {
    inputCadence.value =
      inputDuration.value =
      inputElevation.value =
      inputDistance.value =
        '';
    form.style.display = 'none';
    form.classList.add('hidden');
    setTimeout(() => {
      form.style.display = 'grid';
    }, 1000);
  }

  _hideEditForm() {
    inputCadenceEdit.value =
      inputDurationEdit.value =
      inputElevationEdit.value =
      inputDistanceEdit.value =
        '';
    formEdit.style.display = 'none';
    formEdit.classList.add('hidden');
    setTimeout(() => {
      formEdit.style.display = 'grid';
    }, 1000);
  }

  _toggleElevationField() {
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
  }

  _addCadenceField() {
    inputCadenceEdit
      .closest('.form__row')
      .classList.remove('form__row--hidden');
    inputElevationEdit.closest('.form__row').classList.add('form__row--hidden');
  }

  _addElevationField() {
    inputCadenceEdit.closest('.form__row').classList.add('form__row--hidden');
    inputElevationEdit
      .closest('.form__row')
      .classList.remove('form__row--hidden');
  }

  _newWorkout(e) {
    e.preventDefault();
    const validInputs = (...inputs) =>
      inputs.every((inp) => Number.isFinite(inp));

    const allPositive = (...inputs) => inputs.every((inp) => inp > 0);

    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
    const { lat, lng } = this.#mapEvent.latlng;
    let workout;

    if (type === 'running') {
      const cadence = Number(inputCadence.value);
      if (
        !validInputs(distance, duration, cadence) ||
        !allPositive(distance, duration, cadence)
      ) {
        return alert('Inputs have to be positive numbers!');
      }

      workout = new Running([lat, lng], distance, duration, cadence);
    }

    if (type === 'cycling') {
      const elevation = Number(inputElevation.value);
      if (
        !validInputs(distance, duration, elevation) ||
        !allPositive(distance, duration)
      ) {
        return alert('Inputs have to be positive numbers!');
      }
      workout = new Cycling([lat, lng], distance, duration, elevation);
    }

    this.#workouts.push(workout);

    this._renderWorkoutMarker(workout);

    this._renderWorkout(workout);

    this._hideForm();

    this._setLocalStorage();
  }

  _renderWorkoutMarker(workout) {
    const marker = L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        })
      )
      .setPopupContent(
        `${workout.type === 'running' ? '🏃' : '🚴‍♂️'} ${workout.description}`
      )
      .openPopup();

    this.#markers.push(marker);
  }

  _renderWorkout(workout) {
    let html = `
      <li class="workout workout--${workout.type}" data-id="${workout.id}">
        <h2 class="workout__title">${workout.description}</h2>
        <button class="workout__edit">&#9998;</button>
        <button class="workout__delete">&times;</button>
        <div class="workout__details">
          <span class="workout__icon">${
            workout.type === 'running' ? '🏃' : '🚴‍♂️'
          }</span>
          <span class="workout__value">${workout.distance}</span>
          <span class="workout__unit">km</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">⏱</span>
          <span class="workout__value">${workout.duration}</span>
          <span class="workout__unit">min</span>
        </div>
    `;

    if (workout.type === 'running') {
      html += `
        <div class="workout__details">
          <span class="workout__icon">⚡️</span>
          <span class="workout__value">${workout.pace.toFixed(1)}</span>
          <span class="workout__unit">min/km</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">🦶🏼</span>
          <span class="workout__value">${workout.cadence}</span>
          <span class="workout__unit">spm</span>
        </div>
      </li>
      `;
    }

    if (workout.type === 'cycling') {
      html += `
        <div class="workout__details">
          <span class="workout__icon">⚡️</span>
          <span class="workout__value">${workout.speed.toFixed(1)}</span>
          <span class="workout__unit">km/h</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">⛰</span>
          <span class="workout__value">${workout.elevationGain}</span>
          <span class="workout__unit">m</span>
        </div>
      </li>
      `;
    }

    form.insertAdjacentHTML('afterend', html);
  }

  _moveToPopup(e) {
    if (
      !e.target.classList.contains('workout__delete') &&
      !e.target.classList.contains('workout__edit')
    ) {
      const workoutEl = e.target.closest('.workout');

      if (!workoutEl) return;

      const workout = this.#workouts.find(
        (work) => work.id === workoutEl.dataset.id
      );

      this.#map.setView(workout.coords, this.#mapZoomLevel, {
        animate: true,
        pan: { duration: 1 },
      });
    }
  }

  _deleteWorkout(e) {
    if (e.target.classList.contains('workout__delete')) {
      const workoutEl = e.target.closest('.workout');

      if (!workoutEl) return;

      const workout = this.#workouts.find(
        (work) => work.id === workoutEl.dataset.id
      );

      const index = this.#workouts.indexOf(workout);

      workoutEl.remove();

      this.#workouts.splice(index, 1);
      localStorage.removeItem('workouts');
      localStorage.setItem('workouts', JSON.stringify(this.#workouts));

      this._deleteMarker(workout);
    }
  }

  _deleteMarker(workout) {
    const marker = this.#markers.find(
      (mark) => mark._latlng.lat === workout.coords[0]
    );

    marker.remove();
  }

  _editWorkout(e) {
    if (e.target.classList.contains('workout__edit')) {
      const workoutEl = e.target.closest('.workout');

      if (!workoutEl) return;

      let workout = this.#workouts.find((work) => {
        if (work instanceof Workout) {
          const { ...object } = work;
          return object.id === workoutEl.dataset.id;
        }
        return work.id === workoutEl.dataset.id;
      });

      const index = this.#workouts.indexOf(workout);

      console.log(workout);

      this._showEditForm();

      inputTypeEdit.value = workout.type;
      inputDistanceEdit.value = workout.distance;
      inputDurationEdit.value = workout.duration;

      if (inputTypeEdit.value === 'running') {
        inputCadenceEdit.value = workout.cadence;
        this._addCadenceField();
      }
      if (inputTypeEdit.value === 'cycling') {
        inputElevationEdit.value = workout.elevationGain;
        this._addElevationField();
      }

      formEdit.addEventListener(
        'submit',
        function (e) {
          const validInputs = (...inputs) =>
            inputs.every((inp) => Number.isFinite(inp));

          const allPositive = (...inputs) => inputs.every((inp) => inp > 0);

          e.preventDefault();

          const type = inputTypeEdit.value;
          const distance = +inputDistanceEdit.value;
          const duration = +inputDurationEdit.value;

          if (type === 'running') {
            const cadence = Number(inputCadenceEdit.value);

            const test1 = validInputs(distance, duration, cadence);
            const test2 = allPositive(distance, duration, cadence);
            console.log(
              [distance, duration, cadence],
              test1,
              test2,
              e.target.classList.contains('hidden')
            );

            if (
              !validInputs(distance, duration, cadence) ||
              !allPositive(distance, duration, cadence)
            ) {
              console.log(e);
              return alert('Inputs have to be positive numbers!');
            }
            console.log(e);
            workout = new Running(workout.coords, distance, duration, cadence);
            console.log(workout);
          }

          if (type === 'cycling') {
            const elevation = Number(inputElevationEdit.value);
            if (
              !validInputs(distance, duration, elevation) ||
              !allPositive(distance, duration)
            ) {
              return alert('Inputs have to be positive numbers!');
            }
            workout = new Cycling(
              workout.coords,
              distance,
              duration,
              elevation
            );
            console.log(workout);
          }

          workoutEl.innerHTML = `
            <h2 class="workout__title">${workout.description}</h2>
            <button class="workout__edit">&#9998;</button>
            <button class="workout__delete">&times;</button>
            <div class="workout__details">
              <span class="workout__icon">${
                type === 'running' ? '🏃' : '🚴‍♂️'
              }</span>
              <span class="workout__value">${workout.distance}</span>
              <span class="workout__unit">km</span>
            </div>
            <div class="workout__details">
              <span class="workout__icon">⏱</span>
              <span class="workout__value">${workout.duration}</span>
              <span class="workout__unit">min</span>
            </div>
          `;

          if (type === 'running') {
            workoutEl.innerHTML += `
            <div class="workout__details">
              <span class="workout__icon">⚡️</span>
              <span class="workout__value">${workout.pace.toFixed(1)}</span>
              <span class="workout__unit">min/km</span>
            </div>
            <div class="workout__details">
              <span class="workout__icon">🦶🏼</span>
              <span class="workout__value">${workout.cadence}</span>
              <span class="workout__unit">spm</span>
            </div>
          </li>
          `;
          }

          if (type === 'cycling') {
            workoutEl.innerHTML += `
            <div class="workout__details">
              <span class="workout__icon">⚡️</span>
              <span class="workout__value">${workout.speed.toFixed(1)}</span>
              <span class="workout__unit">km/h</span>
            </div>
            <div class="workout__details">
              <span class="workout__icon">⛰</span>
              <span class="workout__value">${workout.elevationGain}</span>
              <span class="workout__unit">m</span>
            </div>
          </li>
          `;
          }

          workoutEl.dataset.id = workout.id;
          this.#workouts.splice(index, 1);
          this.#workouts.splice(index, 0, workout);

          this._setLocalStorage();
          this._hideEditForm();

          console.log('submited');
        }.bind(this)
      );
    }
  }

  _deleteAllWorkouts(e) {
    e.preventDefault();

    this.#markers.forEach((marker) => marker.remove());

    this.#workouts = [];
    containerWorkouts
      .querySelectorAll('.workout')
      .forEach((work) => work.remove());
    this._setLocalStorage();
  }

  _setLocalStorage() {
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
  }

  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem('workouts'));

    if (!data) return;

    this.#workouts = data;
    this.#workouts.forEach((work) => {
      this._renderWorkout(work);
    });
  }

  reset() {
    localStorage.removeItem('workouts');
    location.reload();
  }
}

const app = new App();
