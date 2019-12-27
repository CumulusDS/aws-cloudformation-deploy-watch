// @flow

import cfnWaitReady from "../../src";

const completeEvent = {
  EventId: "2",
  LogicalResourceId: "stack-name",
  ResourceStatus: "UPDATE_COMPLETE",
  Timestamp: new Date(),
  ResourceStatusReason: "Event 2: Complete"
};

describe("Stack is ready", () => {
  const describeStacks = jest.fn().mockReturnValue({
    promise: jest.fn().mockResolvedValue({
      Stacks: [{ StackStatus: "UPDATE_COMPLETE" }]
    })
  });

  const describeStackEvents = jest.fn().mockReturnValueOnce({
    promise: jest.fn().mockResolvedValue({
      StackEvents: [completeEvent]
    })
  });

  it("returns without describing events", async () => {
    const cloudFormation = { describeStacks, describeStackEvents };
    const params = { StackName: "stack-name" };
    await cfnWaitReady(cloudFormation, params);
    expect(describeStackEvents).not.toBeCalled();
  });
});

describe("Stack is updating", () => {
  const describeStacks = jest.fn().mockReturnValue({
    promise: jest.fn().mockResolvedValue({
      Stacks: [{ StackStatus: "UPDATE_IN_PROGRESS" }]
    })
  });

  describe("completing in first polling cycle", () => {
    const describeStackEvents = jest.fn().mockReturnValueOnce({
      promise: jest.fn().mockResolvedValue({
        StackEvents: [completeEvent]
      })
    });

    it("returns", () => {
      const cloudFormation = { describeStacks, describeStackEvents };
      const params = { StackName: "stack-name" };
      return expect(cfnWaitReady(cloudFormation, params)).resolves.toBeUndefined();
    });
  });

  describe("completing in second polling cycle", () => {
    const incompleteEvent = {
      EventId: "1",
      LogicalResourceId: "other-resource",
      ResourceStatus: "OK",
      Timestamp: new Date(),
      ResourceStatusReason: null
    };
    const stackEvents1 = {
      StackEvents: [incompleteEvent]
    };
    const stackEvents2 = {
      StackEvents: [completeEvent, incompleteEvent]
    };
    const describeStackEvents = jest
      .fn()
      .mockReturnValueOnce({
        promise: jest.fn().mockResolvedValue(stackEvents1)
      })
      .mockReturnValueOnce({
        promise: jest.fn().mockResolvedValue(stackEvents2)
      });

    const flushPromises = () => new Promise(setImmediate);

    it("sleeps once", async () => {
      jest.useFakeTimers();
      jest.spyOn(global, "setTimeout");
      const cloudFormation = { describeStacks, describeStackEvents };
      const params = { StackName: "stack-name" };
      const result = cfnWaitReady(cloudFormation, params);
      await flushPromises();
      await flushPromises();
      jest.runAllTimers();
      expect(setTimeout).toBeCalledTimes(1);
      await result;
    });
  });
});
