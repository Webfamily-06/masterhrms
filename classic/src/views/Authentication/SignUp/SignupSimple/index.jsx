import React from 'react';
import SimpleHeader from '../../SimpleHeader';
import PageFooter from '../../../../layout/Footer/PageFooter';
import Body from './Body';

const SignUpSimple = () => {
    return (
        <div>
            <SimpleHeader />
            <div className="hk-pg-wrapper">
                <Body />
                <PageFooter />
            </div>
        </div>

    )
}

export default SignUpSimple
