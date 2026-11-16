# Custom CMakeLists.txt for MasterHRMS Mobile app
cmake_minimum_required(VERSION 3.13)

# Define the library name
project(appmodules)

# Ensure C++ standard library is linked across all targets
link_libraries(c++_shared)

# Include React Native New Architecture setup
include(${REACT_ANDROID_DIR}/cmake-utils/ReactNative-application.cmake)

# Link c++_shared explicitly to autolinked libraries
if(DEFINED AUTOLINKED_LIBRARIES)
  foreach(autolinked_library ${AUTOLINKED_LIBRARIES})
    if(TARGET ${autolinked_library})
      target_link_libraries(${autolinked_library} c++_shared)
    endif()
  endforeach()
endif()
