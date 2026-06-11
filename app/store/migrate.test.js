const container = require('./container');

jest.mock('./container');

container.getContainers = () => ([{
    name: 'container1',
}, {
    name: 'container2',
    displayIcon: 'mdi:docker',
}, {
    name: 'container3',
    displayIcon: 'mdi:home',
}]);

const migrate = require('./migrate');

beforeEach(() => {
    jest.resetAllMocks();
});

test('migrate should create collection app when not exist', () => {
    const spy = jest.spyOn(container, 'deleteContainer');
    migrate.migrate(undefined, '2.0.0');
    expect(spy).toHaveBeenCalledTimes(3);
});

test('addDisplayNameAndIcon should set displayIcon to ri:box-3-line when missing', () => {
    const spy = jest.spyOn(container, 'updateContainer');
    migrate.migrate('2.0.0', '2.1.0');
    expect(spy).toHaveBeenCalledWith(expect.objectContaining({
        name: 'container1',
        displayIcon: 'ri:box-3-line',
    }));
});

test('migrate should rewrite the legacy mdi:docker default to ri:box-3-line and leave other icons untouched', () => {
    const spy = jest.spyOn(container, 'updateContainer');
    migrate.migrate('2.0.0', '2.1.0');
    // container2 was on the old default -> flipped to the Remix icon
    expect(spy).toHaveBeenCalledWith(expect.objectContaining({
        name: 'container2',
        displayIcon: 'ri:box-3-line',
    }));
    // container3 has an explicit custom icon -> left untouched
    expect(spy).not.toHaveBeenCalledWith(expect.objectContaining({
        name: 'container3',
        displayIcon: 'ri:box-3-line',
    }));
});
