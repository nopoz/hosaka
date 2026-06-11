const container = require('./container');

jest.mock('./container');

container.getContainers = () => ([{
    name: 'container1',
}, {
    name: 'container2',
}]);

const migrate = require('./migrate');

beforeEach(() => {
    jest.resetAllMocks();
});

test('migrate should create collection app when not exist', () => {
    const spy = jest.spyOn(container, 'deleteContainer');
    migrate.migrate(undefined, '2.0.0');
    expect(spy).toHaveBeenCalledTimes(2);
});

test('addDisplayNameAndIcon should set displayIcon to ri:box-3-line when missing', () => {
    const spy = jest.spyOn(container, 'updateContainer');
    migrate.migrate('2.0.0', '2.1.0');
    expect(spy).toHaveBeenCalledWith(expect.objectContaining({
        displayIcon: 'ri:box-3-line',
    }));
});
