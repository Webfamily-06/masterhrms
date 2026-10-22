import classNames from 'classnames';
import React, { useState } from 'react'
import { Button } from 'react-bootstrap';
import { MessageCircle } from 'react-feather';
import ChatPopupBody from './ChatPopupBody';
import ChatPopupFooter from './Footer';
import ChatPopupHeader from './Header';

const ChatPopup = () => {
    const [showChatPopup, setShowChatPopup] = useState(true);
    const [showContacts, setShowContacts] = useState(false);
    const [showPopup, setshowPopup] = useState(true);

    const handleChatPopup = () => {
        setShowChatPopup(!showChatPopup);
        setshowPopup(false);
    }

    return (
        <React.Fragment>
            <div className={classNames("hk-chat-popup", { "d-flex": showChatPopup })} >
                <ChatPopupHeader show={showChatPopup} onClose={() => setShowChatPopup(!showChatPopup)} showContact={showContacts} onHideContact={() => setShowContacts(!showContacts)} />
                <ChatPopupBody showContactList={showContacts} />
                {!showContacts && <ChatPopupFooter />}
            </div>
            <Button variant="primary" size="lg" className="btn-icon btn-floating btn-rounded btn-popup-open" onClick={handleChatPopup} autoFocus >
                <span className="icon">
                    <span className="feather-icon"><MessageCircle /></span>
                </span>
            </Button>
            <div className={classNames("chat-popover shadow-xl", { "d-flex": showPopup })}><p>Try Jampack Chat for free and connect with your customers now!</p></div>

            {/* Page Body */}
            <div className="hk-pg-body py-0">
            </div>
        </React.Fragment>

    )
}

export default ChatPopup
