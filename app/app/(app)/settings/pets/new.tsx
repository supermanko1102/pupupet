import { Stack } from 'expo-router';

import PetEditorScreen from './[petId]';

export default function NewPetScreen() {
  return (
    <>
      <Stack.Screen options={{ title: '新增寵物' }} />
      <PetEditorScreen />
    </>
  );
}
