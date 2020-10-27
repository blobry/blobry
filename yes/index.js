/**
 * Copyright 2020 Teenari
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 * http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

class Blobry {
    constructor() {
        this.todayName = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][new Date().getDay()];
        this.randomMessages = [
            "404? that\'s sad.",
            "Once apon a time, blob\'s didn\'t exist..",
            "Do not chill, blob isn\'t here."
        ];
        this.randomMessage = this.randomMessages[Math.floor(Math.random() * this.randomMessages.length)];
        $('#rando').html(this.randomMessage);
        this.color = Cookies.get('color') || this.pagecolor();
        this.setColor();

        $('#color').click(() => {
            return this.setColor(this.color === 'white' ? 'gray' : 'white');
        });
    }

    setColor(color=this.color) {
        this.color = color;
        Cookies.set('color', color);
        switch(color) {
            case 'white': {
                document.getElementsByTagName('html')[0].classList.add('white');
                $('html').css('color', '');
                $('.colorchange').children()[0].innerText = 'GRAY';
            } break;

            case 'gray': {
                document.getElementsByTagName('html')[0].classList.remove('white');
                $('.colorchange').children()[0].innerText = 'WHITE';
                $('html').css('color', 'white');
            } break;

            default: {
                console.log(`Unknown color: ${color}`);
                return this.setColor('white');
            } break;
        }
        return this;
    }

    pagecolor() {
        const hours = (new Date()).getHours();
        return (hours >= 6 && hours < 20) ? 'white' : 'black';
    }
}

$(document).ready(async () => {
    globalThis.blobry = new Blobry();
});