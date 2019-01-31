//import { selectOptimal } from './optimal-select.js';
//import { CssSelectGenerator } from './css-selector-generator.js';
import finder from '@medv/finder';

function attach() {
    console.log('attach');

    const inputs = document.querySelectorAll('input, textarea');
	inputs.forEach(
        input => {
            input.addEventListener('input', handleInput, true);
        }
    );

    const observer = new MutationObserver(handleMutation);
	const config = {
		childList: true,
		subtree: true
	};

	const all = document.querySelectorAll('body *');
	all.forEach(
        element => {
            observer.observe(element, config);
        }
    );

    const selects = document.querySelectorAll('select');
	selects.forEach(
        select => {
            select.addEventListener('change', handleChange, true); 
        }
    );

    document.body.addEventListener('click', handleClick, true);
    
    document.body.addEventListener('submit', handleSubmit, true);
}


function handleInput(e) {
    if (e.type === 'input') {
        const type = e.type;
        const selector = computeSelector(e.target);
        const value = e.target.value;
        handleEvent(type, selector, value);
    }
}

function handleMutation(mutations) {
	mutations.forEach(mutationRecord => {
		if (mutationRecord.type === 'childList') {
            const addedNodes = mutationRecord.addedNodes;
            addedNodes.forEach(
                addedNode => {
                    if (addedNode.tagName) {
                        const inputs = addedNode.querySelectorAll('input, textarea');
                        inputs.forEach(
                            input => {
                                input.addEventListener('input', handleInput);
                            }
                        )
                    }
                }
            )
		}
	});
}

function handleChange(e) {
    if (e.type === 'change') {
        const type = e.type;
        const selector = computeSelector(e.target);
        const value = e.target.value;
        handleEvent(type, selector, value);
    }
}

function handleClick (e) {
    if (e.type === 'click') {
        const type = e.type;
        const selector = computeSelector(e.target);
        const value = 'click';
        handleEvent(type, selector, value);
    }
}

function handleSubmit (e) {
    if (e.type === 'submit') {
        const type = e.type;
        const selector = computeSelector(e.target);
        const value = 'submit';
        handleEvent(type, selector, value);
    }
}

function handleEvent(type, selector, value){
    if (isEmpty(type)) return undefined;
    if (isEmpty(selector)) return undefined;
    if (isEmpty(value)) return undefined;
    chrome.runtime.sendMessage({
        kind:'addEventToExpedition',
        event: {
            type: type,
            selector: selector,
            value: value
        }
    });
    return true;
}

function isEmpty(field) {
    return field === undefined || field === null || field === "";
}

function computeSelector(el) {
    //return computeSelectorOptimal(el);
    //return computeSelectorCssSelectGenerator(el);
    return computeSelectorFinder(el);
}

function computeSelectorFinder(el) {
    return finder(el);
}

function computeSelectorCssSelectGenerator(el) {
    let generator = new CssSelectGenerator;
    return generator.getSelector(el);
}

function computeSelectorOptimal(el) {
    return selectOptimal(el, {
        root: document,
        priority: ['id','class','href','src'],
        ignore: {
            class(className) {
                return (className==='class') || (className.indexOf('ng-') !== -1);
            }
        }
    });
}

attach();

