/*
Copyright (c) Uber Technologies, Inc.

This source code is licensed under the MIT license found in the
LICENSE file in the root directory of this source tree.
*/
// @flow
import * as React from 'react';
import {createPopper, type Instance as PopperInstance} from '@popperjs/core';
import {toPopperPlacement, parsePopperOffset} from './utils.js';
import {TETHER_PLACEMENT} from './constants.js';
import type {TetherPropsT, TetherStateT} from './types.js';

class Tether extends React.Component<TetherPropsT, TetherStateT> {
  static defaultProps = {
    anchorRef: null,
    onPopperUpdate: () => null,
    placement: TETHER_PLACEMENT.auto,
    popperRef: null,
    popperOptions: {},
  };

  popper: ?PopperInstance;
  popperHeight = 0;
  popperWidth = 0;
  anchorHeight = 0;
  anchorWidth = 0;

  state = {
    isMounted: false,
  };

  componentDidMount() {
    this.setState({isMounted: true});
  }

  componentDidUpdate(prevProps: TetherPropsT, prevState: TetherStateT) {
    // Handles the case where popover content changes size and creates a gap between the anchor and
    // the popover. Popper.js only schedules updates on resize and scroll events. In the case of
    // the Select component, when options were filtered in the dropdown menu it creates a gap
    // between it and the input element.

    if (this.props.anchorRef) {
      const {height, width} = this.props.anchorRef.getBoundingClientRect();

      if (this.anchorHeight !== height || this.anchorWidth !== width) {
        this.anchorHeight = height;
        this.anchorWidth = width;
        this.popper && this.popper.update();
      }
    }

    if (this.props.popperRef) {
      const {height, width} = this.props.popperRef.getBoundingClientRect();

      if (this.popperHeight !== height || this.popperWidth !== width) {
        this.popperHeight = height;
        this.popperWidth = width;
        this.popper && this.popper.update();
      }

      if (this.state.isMounted !== prevState.isMounted) {
        if (!this.props.anchorRef) {
          if (__DEV__) {
            // eslint-disable-next-line no-console
            console.warn(
              `[baseui][TetherBehavior] ref has not been passed to the Popper's anchor element.
              See how to pass the ref to an anchor element in the Popover example
              http://baseui.design/components/popover#anchor-ref-handling-example`,
            );
          }
        } else {
          this.initializePopper();
        }
      }
    }
  }

  componentWillUnmount() {
    this.destroyPopover();
  }

  initializePopper() {
    const {placement, popperOptions} = this.props;
    const {modifiers, ...restOptions} = popperOptions;

    if (!this.props.anchorRef || !this.props.popperRef) return;

    this.popper = createPopper(this.props.anchorRef, this.props.popperRef, {
      // Recommended placement (popper may ignore if it causes a viewport overflow, etc)
      placement: toPopperPlacement(placement),
      modifiers: [
        // Passing the arrow ref will measure the arrow when calculating styles
        {
          name: 'arrow',
          enabled: !!this.props.arrowRef,
          options: {
            element: this.props.arrowRef,
          },
        },
        {
          // Make popper use top/left instead of transform translate, this is because
          // we use transform for animations and we dont want them to conflict
          name: 'computeStyles',
          options: {
            gpuAcceleration: false,
            adaptive: false,
          },
        },
        {
          // Disable default styling modifier, we'll apply styles on our own
          name: 'applyStyles',
          enabled: false,
        },
        {
          name: 'applyReactStyle',
          enabled: true,
          phase: 'write',
          fn: this.onPopperUpdate,
        },
        {
          name: 'preventOverflow',
          enabled: true,
        },
        ...modifiers,
      ],
      ...restOptions,
    });
  }

  onPopperUpdate = ({state}) => {
    const normalizedOffsets = {
      popper: parsePopperOffset(state.modifiersData.popperOffsets),
      arrow: state.modifiersData.arrow
        ? parsePopperOffset(state.modifiersData.arrow)
        : {top: 0, left: 0},
    };
    this.props.onPopperUpdate(normalizedOffsets, state);
  };

  destroyPopover() {
    if (this.popper) {
      this.popper.destroy();
      delete this.popper;
    }
  }

  render() {
    return this.props.children || null;
  }
}

export default Tether;
