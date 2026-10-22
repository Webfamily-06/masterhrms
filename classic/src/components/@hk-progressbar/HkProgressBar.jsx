import React, { useEffect, useState } from 'react'
import classNames from 'classnames';
import { ProgressBar } from 'react-bootstrap';
import PropTypes from 'prop-types';

const HkProgress = ({
    now,
    max = 100,
    min = 0,
    label,
    striped,
    variant,
    size,
    key,
    animated,
    rounded,
    className,
    bsPrefix
}) => {

    const [currentValue, setcurrentValue] = useState(0);

    useEffect(() => {
        setTimeout(() => setcurrentValue(now), 500);
    }, [now])

    return (
        <>
            <ProgressBar
                variant={variant}
                now={currentValue}
                max={max}
                min={min}
                key={key}
                animated={animated}
                label={label}
                striped={striped}
                className={classNames(className, { "progress-bar-rounded": rounded }, (size ? `progress-bar-${size}` : ""))}
                bsPrefix={bsPrefix}
            />
        </>
    )
}

const Label = ({ children, className }) => <label className={classNames("progress-label", className)}>{children}</label>
HkProgress.Label = Label;

const Wrapper = ({ children, className }) => <div className={classNames("progress-lb-wrap", className)}>{children}</div>
HkProgress.Wrapper = Wrapper;

HkProgress.propTypes = {
    now: PropTypes.number.isRequired,
    max: PropTypes.number,
    min: PropTypes.number,
    variant: PropTypes.string,
    label: PropTypes.node,
    striped: PropTypes.bool,
    size: PropTypes.string,
    animated: PropTypes.bool,
    rounded: PropTypes.bool,
}


export default HkProgress
