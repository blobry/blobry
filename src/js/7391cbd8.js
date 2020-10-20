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
            "It's a bird!. It's a plane! It's Blobry..",
            "Once apon a time, blob.",
            "Chill, blob is here.",
            "confusion what is blob and blobry",
            `Doubled up blob on a ${this.todayName}.`,
            `Already blob ${this.todayName}???`,
            `Hey it's ${new Date().getHours()}, so, ${new Date().getHours()} blob row!`,
            "finna blob up in here",
            "teenari caodaar - haha yes",
            "epic caodaar - haha yes",
            "azlee is not funny. - azlee - idc - teenari",
            "rip professionalism 2020 to 2020"
        ];
        this.randomMessage = this.randomMessages[Math.floor(Math.random() * this.randomMessages.length)];
        $('#rando').html(this.randomMessage);
        if(Cookies.get('cutscene') && this.randomMessage === `Hey it's ${new Date().getHours()}, so, ${new Date().getHours()} blob row!`) {
            $('#blob').css('background-image', `url(favicon.ico)`);
            $('#blob').css('background-repeat', 'repeat');
            $('#blob').css('background-size', `${new Date().getHours() * 3 + 2}px`);
        }
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
    $('#redo').click(() => {
        Cookies.remove('cutscene');
        location = location;
    });
    if(!Cookies.get('cutscene')) {
        $('svg').eq(0).animate({left: '107'}, 500);
        await new Promise(resolve => setTimeout(resolve, 500));
        $('svg').eq(2).animate({left: '-108px'}, 500);
        await new Promise(resolve => setTimeout(resolve, 500));
        $('svg').eq(0).remove();
        $('svg').eq(2).remove();
        $('svg').eq(0).animate({width: '350px'}, 500);
        $('svg').eq(1).remove();
        $('[style="position: relative;left: -4vh;"]').animate({left: '-30px'}, 500);
        $('html').css('overflow', '');
        await new Promise(resolve => setTimeout(resolve, 500));
        $('.section').eq(1).css('display', '');
        $('#rando').css('display', '').animate({top: '83%'}, 500);
        Cookies.set('cutscene', true);
    }
    else {
        $('svg').eq(0).remove();
        $('')
        $('svg').eq(2).remove();
        $('svg').eq(1).remove();
        $('[style="position: relative;left: -4vh;"]').animate({left: '-30px'}, 500);
        $('html').css('overflow', '');
        $('.section').eq(1).css('display', '');
        $('#rando').css('display', '').animate({top: '83%'}, 500);
        $('svg').css('width', '350px');
    }
    // await new Promise((resolve) => setTimeout(resolve, 500));
    // $('#blob').css('animation', 'move 5s ease-in-out infinite');
});